// Service Worker for Praishe's Campus PWA
// Handles Web Push Notifications and offline caching

const CACHE_NAME = "praishe-campus-v1";
const OFFLINE_URLS = ["/", "/schedule", "/tasks", "/exams"];

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

// ── Push Notification Handler ───────────────────────────────
self.addEventListener("push", (event) => {
    let data = {
        title: "Praishe's Campus",
        body: "You have a new notification 🌸",
        url: "/",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        data: { url: data.url },
        vibrate: [200, 100, 200],
        tag: "praishe-campus-notification",
        renotify: true,
        actions: [
            { action: "open", title: "Open App" },
            { action: "dismiss", title: "Dismiss" },
        ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

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
