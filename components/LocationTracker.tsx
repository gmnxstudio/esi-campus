'use client'

import { useEffect, useRef } from 'react'

const TRACKING_INTERVAL = 15 * 60 * 1000 // 15 minutes
const SYNC_API = '/api/location/sync'
const DEVICE_ID_KEY = 'praishe_device_id'

// Generate or retrieve a persistent device UUID
function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    console.log('[Tracker] New device ID generated:', id)
  }
  return id
}

export default function LocationTracker() {
  const lastSyncRef = useRef<number>(0)
  const deviceIdRef = useRef<string>('')

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.warn('[Tracker] Geolocation not supported.')
      return
    }

    deviceIdRef.current = getDeviceId()
    console.log('[Tracker] Device ID:', deviceIdRef.current)

    let interval: ReturnType<typeof setInterval> | null = null

    const initTracking = async () => {
      // Request geolocation permission
      try {
        const geoPermission = await navigator.permissions?.query?.({ name: 'geolocation' })
        console.log('[Tracker] Geo permission:', geoPermission?.state)
        if (geoPermission?.state === 'denied') return

        if (geoPermission?.state === 'prompt') {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              () => resolve(),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            )
          })
        }
      } catch {
        // Permission API not available, proceed
      }

      await syncLocation('APP_OPEN')
      interval = setInterval(() => syncLocation('INTERVAL'), TRACKING_INTERVAL)
    }

    initTracking()

    // Sync when app returns to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastSyncRef.current
        if (elapsed > TRACKING_INTERVAL) {
          syncLocation('FOREGROUND_RETURN')
        }
      }
    }

    const handleFocus = () => {
      const elapsed = Date.now() - lastSyncRef.current
      if (elapsed > TRACKING_INTERVAL) {
        syncLocation('WINDOW_FOCUS')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Listen for SW postMessage
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_LOCATION') {
        syncLocation('PUSH_TRIGGERED')
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)

    // Register SW & Push
    registerServiceWorkerAndPush(deviceIdRef.current)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
    }
  }, [])

  const syncLocation = async (trigger: string) => {
    const deviceId = deviceIdRef.current
    console.log(`[Tracker] syncLocation(${trigger}) device=${deviceId.substring(0, 8)}...`)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      console.log(`[Tracker] Position: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy?.toFixed(0)}m)`)

      const res = await fetch(SYNC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          latitude,
          longitude,
          device_info: navigator.userAgent,
          sync_status: 'OK',
          trigger,
        }),
      })

      if (res.ok) {
        lastSyncRef.current = Date.now()
        console.log(`[Tracker] ✅ Synced (${trigger})`)
      } else {
        console.error(`[Tracker] Sync error ${res.status}`)
      }
    } catch (err: any) {
      console.warn(`[Tracker] Geo failed (${trigger}):`, err.message)
      try {
        await fetch(SYNC_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
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
async function registerServiceWorkerAndPush(deviceId: string) {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[Tracker] SW registered.')
    await navigator.serviceWorker.ready

    if ('PushManager' in window) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
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
          device_id: deviceId,
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
