// Supabase Edge Function: send-notification (v2)
// Self-contained: sends web push directly using Web Crypto API (no NEXTJS_URL needed)
// Deploy with: supabase functions deploy send-notification

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── VAPID JWT helpers using Web Crypto ──────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const raw = atob(b64 + pad);
    return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}

function base64UrlEncode(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let str = "";
    bytes.forEach((b) => (str += String.fromCharCode(b)));
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function importVapidPrivateKey(vapidPrivateKeyB64Url: string): Promise<CryptoKey> {
    const raw = base64UrlDecode(vapidPrivateKeyB64Url);
    // Import as PKCS8 requires the full DER wrapper — use raw P-256 import trick
    const keyData = raw;
    return await crypto.subtle.importKey(
        "pkcs8",
        buildPkcs8(keyData),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );
}

function buildPkcs8(rawKey: Uint8Array): ArrayBuffer {
    // Minimal ASN.1 PKCS8 DER wrapper for P-256 private key
    const header = new Uint8Array([
        0x30, 0x81, 0x87,                                    // SEQUENCE (135 bytes)
        0x02, 0x01, 0x00,                                    // version = 0
        0x30, 0x13,                                          // SEQUENCE (19 bytes)
        0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
        0x04, 0x6d,                                          // OCTET STRING (109 bytes)
        0x30, 0x6b,                                          // SEQUENCE (107 bytes)
        0x02, 0x01, 0x01,                                    // version = 1
        0x04, 0x20,                                          // OCTET STRING (32 bytes) = private key
    ]);
    const trailer = new Uint8Array([
        0xa1, 0x44,                                          // [1] EXPLICIT
        0x03, 0x42, 0x00,                                    // BIT STRING
        // 65 bytes of uncompressed public key follow (we use zero as placeholder)
        ...new Uint8Array(65),
    ]);
    const buf = new Uint8Array(header.length + 32 + trailer.length);
    buf.set(header);
    buf.set(rawKey.slice(0, 32), header.length);
    buf.set(trailer, header.length + 32);
    return buf.buffer;
}

async function makeVapidJwt(
    audience: string,          // e.g. "https://fcm.googleapis.com"
    subject: string,           // e.g. "mailto:..."
    vapidPublicKey: string,
    vapidPrivateKey: string
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(
        new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })).buffer
    );
    const payload = base64UrlEncode(
        new TextEncoder().encode(
            JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })
        ).buffer
    );
    const sigInput = `${header}.${payload}`;
    const key = await importVapidPrivateKey(vapidPrivateKey);
    const sig = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        new TextEncoder().encode(sigInput)
    );
    return `${sigInput}.${base64UrlEncode(sig)}`;
}

// ── AES-128-GCM encryption helpers ──────────────────────────────────────────

async function encryptPayload(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: string
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Generate ephemeral ECDH key pair
    const serverKeyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
    );

    // Import receiver's public key
    const clientPublicKey = await crypto.subtle.importKey(
        "raw",
        base64UrlDecode(subscription.p256dh),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: "ECDH", public: clientPublicKey },
        serverKeyPair.privateKey,
        256
    );

    const authSecret = base64UrlDecode(subscription.auth);
    const serverPublicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
    );

    // HKDF for content encryption key & nonce (RFC 8291)
    const ikm = await hkdf(
        new Uint8Array(sharedSecret),
        authSecret,
        buildInfo("auth", new Uint8Array(0), new Uint8Array(0)),
        32
    );
    const clientPublicKeyRaw = base64UrlDecode(subscription.p256dh);
    const prk = await hkdf(
        ikm,
        salt,
        buildInfo("aesgcm", clientPublicKeyRaw, serverPublicKeyRaw),
        32
    );
    const contentEncKey = await hkdf(prk, salt, buildInfo("content-encryption-key", clientPublicKeyRaw, serverPublicKeyRaw), 16);
    const nonce = await hkdf(prk, salt, buildInfo("nonce", clientPublicKeyRaw, serverPublicKeyRaw), 12);

    const aesKey = await crypto.subtle.importKey("raw", contentEncKey, "AES-GCM", false, ["encrypt"]);
    const payloadBytes = new TextEncoder().encode(payload);
    // Pad to avoid length-based fingerprinting
    const padded = new Uint8Array(2 + payloadBytes.length);
    padded.set(payloadBytes, 2);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded);

    return { body: new Uint8Array(encrypted), salt, serverPublicKey: serverPublicKeyRaw };
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
    const info = new TextEncoder().encode(`Content-Encoding: ${type}\x00P-256\x00`);
    const buf = new Uint8Array(info.length + 2 + clientKey.length + 2 + serverKey.length);
    let offset = 0;
    buf.set(info, offset); offset += info.length;
    new DataView(buf.buffer).setUint16(offset, clientKey.length, false); offset += 2;
    buf.set(clientKey, offset); offset += clientKey.length;
    new DataView(buf.buffer).setUint16(offset, serverKey.length, false); offset += 2;
    buf.set(serverKey, offset);
    return buf;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const keyMaterial = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt, info },
        keyMaterial,
        length * 8
    );
    return new Uint8Array(bits);
}

// ── Main push sender ─────────────────────────────────────────────────────────

async function sendOnePush(
    sub: { endpoint: string; p256dh: string; auth: string },
    payloadStr: string,
    vapidPublicKey: string,
    vapidPrivateKey: string,
    vapidSubject: string
): Promise<void> {
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await makeVapidJwt(audience, vapidSubject, vapidPublicKey, vapidPrivateKey);
    const { body, salt, serverPublicKey } = await encryptPayload(sub, payloadStr);

    const res = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
            Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aesgcm",
            Encryption: `salt=${base64UrlEncode(salt.buffer)}`,
            "Crypto-Key": `dh=${base64UrlEncode(serverPublicKey.buffer)}`,
            TTL: "86400",
        },
        body,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Push failed ${res.status}: ${text}`);
    }
}

// ── Edge Function entrypoint ─────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:praishe@campus.app";

        const supabase = createClient(supabaseUrl, serviceKey);
        const { title, body, url } = await req.json();

        if (!title || !body) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: title, body" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth");

        if (error) throw error;
        if (!subscriptions?.length) {
            return new Response(
                JSON.stringify({ message: "No subscriptions found" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        const payload = JSON.stringify({ title, body, url: url ?? "/" });

        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                sendOnePush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject)
            )
        );

        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return new Response(
            JSON.stringify({ success: true, sent, failed }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Edge function error:", err);
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
