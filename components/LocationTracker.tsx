'use client'

import { useEffect, useRef } from 'react'

const TRACKING_INTERVAL = 15 * 60 * 1000 // 15 minutes
const SYNC_API = '/api/location/sync'

export default function LocationTracker() {
  const lastSyncRef = useRef<number>(0)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.warn('[Tracker] Geolocation not supported.')
      return
    }

    let interval: ReturnType<typeof setInterval> | null = null

    // ── Phase 1: Ensure permissions are granted first ───────
    const initTracking = async () => {
      // Request geolocation permission explicitly
      try {
        const geoPermission = await navigator.permissions?.query?.({ name: 'geolocation' })
        console.log('[Tracker] Geo permission state:', geoPermission?.state)

        if (geoPermission?.state === 'denied') {
          console.warn('[Tracker] Location permission denied.')
          return
        }

        // If permission is 'prompt', trigger it by requesting position
        if (geoPermission?.state === 'prompt') {
          console.log('[Tracker] Requesting geolocation permission...')
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              () => resolve(), // Resolve even on error (user may deny)
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            )
          })
        }
      } catch (e) {
        console.warn('[Tracker] Permission API not available, proceeding anyway.')
      }

      // ── Phase 2: First sync right after permission is granted ─
      await syncLocation('APP_OPEN')

      // ── Phase 3: Set up periodic tracking ─────────────────────
      interval = setInterval(() => syncLocation('INTERVAL'), TRACKING_INTERVAL)
    }

    initTracking()

    // ── Phase 4: Sync when app comes back to foreground ─────
    // Mobile browsers throttle/kill setInterval when backgrounded.
    // This catches the user returning to the app.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastSync = Date.now() - lastSyncRef.current
        if (timeSinceLastSync > TRACKING_INTERVAL) {
          console.log('[Tracker] App returned to foreground, syncing...')
          syncLocation('FOREGROUND_RETURN')
        }
      }
    }

    // Also sync when the window regains focus (covers PWA restore scenarios)
    const handleFocus = () => {
      const timeSinceLastSync = Date.now() - lastSyncRef.current
      if (timeSinceLastSync > TRACKING_INTERVAL) {
        syncLocation('WINDOW_FOCUS')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // ── Phase 5: Listen for Service Worker postMessage ───────
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_LOCATION') {
        console.log('[Tracker] SW requested location via postMessage.')
        syncLocation('PUSH_TRIGGERED')
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)

    // ── Phase 6: Register SW & Push (independent of tracking) ──
    registerServiceWorkerAndPush()

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
    }
  }, [])

  // Store lastSyncRef in closure for visibility handler
  const syncLocation = async (trigger: string) => {
    console.log(`[Tracker] syncLocation() triggered by: ${trigger}`)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,  // Give more time on slower devices
          maximumAge: 60000, // Accept cached position up to 1 min old
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      const deviceInfo = navigator.userAgent
      console.log(`[Tracker] Position: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy?.toFixed(0)}m)`)

      const res = await fetch(SYNC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          device_info: deviceInfo,
          sync_status: 'OK',
          trigger,
        }),
      })

      if (res.ok) {
        lastSyncRef.current = Date.now()
        console.log(`[Tracker] ✅ Synced (${trigger})`)
      } else {
        const text = await res.text()
        console.error(`[Tracker] Sync API ${res.status}:`, text)
      }
    } catch (err: any) {
      console.warn(`[Tracker] Geo failed (${trigger}):`, err.message || err)
      try {
        await fetch(SYNC_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: null,
            longitude: null,
            device_info: navigator.userAgent,
            sync_status: 'FAILED',
            failure_reason: err.message || 'Geolocation error',
            trigger,
          }),
        })
      } catch { /* silently ignore */ }
    }
  }

  return null
}

// ── Service Worker + Push Registration ─────────────────────
async function registerServiceWorkerAndPush() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[Tracker] SW registered.')
    await navigator.serviceWorker.ready

    // Push subscription (separate from location tracking)
    if ('PushManager' in window) {
      const perm = await Notification.requestPermission()
      console.log('[Tracker] Notification permission:', perm)
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { console.error('[Tracker] No VAPID key.'); return }

      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
        console.log('[Tracker] New push subscription.')
      }

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          userAgent: navigator.userAgent,
        }),
      })
      console.log('[Tracker] Push subscription saved.')
    }
  } catch (err) {
    console.error('[Tracker] SW error:', err)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
