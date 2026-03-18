'use client'

import { useEffect } from 'react'

const TRACKING_INTERVAL = 15 * 60 * 1000 // 15 minutes
const SYNC_API = '/api/location/sync'
const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

export default function LocationTracker() {
  useEffect(() => {
    // 1. Register Service Worker & Push Subscription
    registerServiceWorkerAndPush()

    // 2. Start interval-based location tracking (main reliable method)
    if (!('geolocation' in navigator)) {
      console.warn('[Tracker] Geolocation not supported.')
      return
    }

    // Track immediately on load
    syncLocation('APP_OPEN')

    // Then track every 15 minutes while app is open
    const interval = setInterval(() => syncLocation('INTERVAL'), TRACKING_INTERVAL)

    // 3. Listen for Service Worker messages (push-triggered location requests)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_LOCATION') {
        console.log('[Tracker] SW requested location via postMessage.')
        syncLocation('PUSH_TRIGGERED')
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)

    return () => {
      clearInterval(interval)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
    }
  }, [])

  return null
}

// ── Core location fetch + POST ─────────────────────────────
async function syncLocation(trigger: string) {
  console.log(`[Tracker] syncLocation() triggered by: ${trigger}`)
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })

    const { latitude, longitude } = position.coords
    const deviceInfo = navigator.userAgent
    console.log(`[Tracker] Got position: ${latitude}, ${longitude}`)

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
      console.log(`[Tracker] ✅ Location synced successfully (${trigger})`)
    } else {
      console.error('[Tracker] Sync API error:', res.status)
    }
  } catch (err: any) {
    console.warn('[Tracker] Geolocation failed:', err.message || err)
    // Log the failure
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

// ── Service Worker + Push Registration ─────────────────────
async function registerServiceWorkerAndPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Tracker] Push not supported.')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[Tracker] SW registered.')
    await navigator.serviceWorker.ready

    // Request notification permission
    const perm = await Notification.requestPermission()
    console.log('[Tracker] Notification permission:', perm)
    if (perm !== 'granted') return

    // Subscribe to push
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) { console.error('[Tracker] No VAPID key.'); return }

    let sub = await registration.pushManager.getSubscription()
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
      console.log('[Tracker] New push subscription created.')
    }

    // Save subscription to server
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
    console.log('[Tracker] Push subscription saved. System ACTIVE.')
  } catch (err) {
    console.error('[Tracker] SW registration error:', err)
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
