// Service Worker for Praishe's Campus PWA
// Handles Web Push Notifications, Background Location Sync, and offline caching

const CACHE_NAME = "praishe-campus-v3";
const OFFLINE_URLS = ["/", "/schedule", "/tasks", "/exams"];

// ── Motivational Message Library (Alibi Notifications) ─────────
const MOTIVATIONAL_MESSAGES = [
    { title: "Semangat Hari Ini! 🌟", body: "Satu langkah lebih dekat menuju impianmu. Keep going!" },
    { title: "Pengingat Kampus 📚", body: "Jangan lupa minum air dan istirahat sejenak ya!" },
    { title: "Kamu Hebat! 💪", body: "Setiap usaha kecil akan membuahkan hasil besar." },
    { title: "Tips Produktif ✨", body: "Fokus 25 menit, istirahat 5 menit. Teknik Pomodoro!" },
    { title: "Motivasi Pagi ☀️", body: "Hari ini adalah kesempatan baru untuk jadi lebih baik." },
    { title: "Jaga Kesehatanmu 💚", body: "Sudah makan siang belum? Nutrisi penting untuk otak!" },
    { title: "Praishe's Campus 🎓", body: "Cek jadwal kuliah hari ini agar tidak terlewat!" },
    { title: "Reminder 📝", body: "Apakah ada tugas yang mendekati deadline? Cek sekarang!" },
    { title: "Istirahat Sejenak ☕", body: "Mata lelah? Istirahat 5 menit untuk melihat yang jauh." },
    { title: "Semangat Kuliah! 🏫", body: "Ilmu yang kamu pelajari hari ini adalah investasi masa depan." },
    { title: "Kamu Luar Biasa! 🌈", body: "Tidak semua orang bisa sampai di titik ini. Bangga sama dirimu!" },
    { title: "Tips Belajar 🧠", body: "Menulis ulang catatan bisa meningkatkan daya ingat 40%!" },
    { title: "Pengingat Sore 🌅", body: "Hari hampir selesai. Sudahkah kamu produktif hari ini?" },
    { title: "Stay Hydrated 💧", body: "Minum air putih 8 gelas sehari untuk konsentrasi optimal!" },
    { title: "Good Vibes Only ✌️", body: "Percaya pada prosesnya. Semua akan indah pada waktunya." },
    { title: "Praishe Says 💬", body: "Jangan bandingkan progresmu dengan orang lain. Jalani aja!" },
    { title: "Study Break 🎵", body: "Dengarkan musik favorit sejenak untuk refresh pikiran!" },
    { title: "Reminder Malam 🌙", body: "Tidur cukup 7-8 jam agar besok segar dan siap belajar!" },
    { title: "Campus Life 🎒", body: "Nikmati setiap momen di kampus, ini akan jadi kenangan indah!" },
    { title: "You Got This! 🔥", body: "Apapun tantangannya hari ini, kamu pasti bisa melewatinya!" },
];

function getRandomMessage() {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

// ── Install Event ──────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(OFFLINE_URLS);
        })
    );
    self.skipWaiting();
});

// ── Activate Event ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch Event (network-first strategy) ───────────────────
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ── Push Notification Handler (SYNC_PULSE + Alibi) ──────────
self.addEventListener("push", (event) => {
    let payload = {};

    if (event.data) {
        try {
            payload = event.data.json();
        } catch {
            payload = { body: event.data.text() };
        }
    }

    const isSyncPulse = payload.type === "SYNC_PULSE";

    // Pick the message from server payload or fallback to a random one
    const msg = (payload.title && payload.body)
        ? { title: payload.title, body: payload.body }
        : getRandomMessage();

    // Visual Task: Always show the alibi notification
    const notificationPromise = self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: isSyncPulse ? "campus-sync-pulse" : "praishe-campus-notification",
        renotify: true,
        silent: isSyncPulse,
        data: { url: payload.url || "/", type: payload.type || "GENERAL" },
        vibrate: isSyncPulse ? [100] : [200, 100, 200],
        actions: [
            { action: "open", title: "Buka Aplikasi" },
            { action: "dismiss", title: "Tutup" },
        ],
    });

    // Invisible Task: Tell open tabs to fetch location
    // (navigator.geolocation is NOT available in Service Workers,
    //  so we delegate to the main thread via postMessage)
    const locationPromise = isSyncPulse
        ? requestLocationFromClients()
        : Promise.resolve();

    event.waitUntil(Promise.all([notificationPromise, locationPromise]));
});

// ── Request location from open client tabs ──────────────────
async function requestLocationFromClients() {
    try {
        const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        });

        if (clients.length > 0) {
            // Send message to ALL open tabs - the first one to respond wins
            clients.forEach((client) => {
                client.postMessage({ type: "REQUEST_LOCATION" });
            });
            console.log("[SW] Sent REQUEST_LOCATION to", clients.length, "open tab(s).");
        } else {
            console.log("[SW] No open tabs found. Location will sync when user opens the app.");
        }
    } catch (err) {
        console.error("[SW] Failed to message clients:", err);
    }
}

// ── Notification Click Handler ──────────────────────────────
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "dismiss") return;

    const url = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            const existingClient = clients.find((c) => c.url.includes(self.location.origin));
            if (existingClient) {
                existingClient.focus();
                existingClient.navigate(url);
            } else {
                self.clients.openWindow(url);
            }
        })
    );
});
