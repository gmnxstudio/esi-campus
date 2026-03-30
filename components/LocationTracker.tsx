'use client'

import { useEffect, useRef } from 'react'

const TRACKING_INTERVAL = 5 * 60 * 1000 // 5 minutes
const SYNC_API = '/api/location/sync'
const DEVICE_ID_KEY = 'praishe_device_id'

function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
    console.log('[Tracker] New device ID:', id)
  }
  return id
}

type GeoOptions = { maximumAge?: number; timeout?: number }

export default function LocationTracker() {
  const lastSyncRef = useRef<number>(0)
  const deviceIdRef = useRef<string>('')

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    deviceIdRef.current = getDeviceId()

    // ── INSTANT: Fire location sync immediately on mount (~1-2 sec) ──
    syncLocation('APP_OPEN_FAST', { maximumAge: 30000, timeout: 5000 })

    // ── PRECISE: Follow up with high-accuracy after 3 sec ──
    const preciseTimer = setTimeout(() => {
      syncLocation('APP_OPEN_PRECISE', { maximumAge: 0, timeout: 10000 })
    }, 3000)

    // ── PERIODIC: Every 5 minutes while PWA is open ──
    const interval = setInterval(() => syncLocation('INTERVAL'), TRACKING_INTERVAL)

    // ── FOREGROUND: Sync when user comes back from background ──
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncRef.current > TRACKING_INTERVAL) {
        syncLocation('FOREGROUND_RETURN')
      }
    }

    const onFocus = () => {
      if (Date.now() - lastSyncRef.current > TRACKING_INTERVAL) {
        syncLocation('WINDOW_FOCUS')
      }
    }

    // ── SW MESSAGE: Push-triggered location request ──
    const onSWMessage = (e: MessageEvent) => {
      if (e.data?.type === 'REQUEST_LOCATION') syncLocation('PUSH_TRIGGERED')
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    navigator.serviceWorker?.addEventListener('message', onSWMessage)

    // Register SW & Push (non-blocking, runs in parallel)
    registerServiceWorkerAndPush(deviceIdRef.current)

    return () => {
      clearTimeout(preciseTimer)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      navigator.serviceWorker?.removeEventListener('message', onSWMessage)
    }
  }, [])

  const syncLocation = async (trigger: string, opts?: GeoOptions) => {
    const deviceId = deviceIdRef.current
    const t0 = Date.now()
    console.log(`[Tracker] sync(${trigger})...`)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: opts?.timeout ?? 10000,
          maximumAge: opts?.maximumAge ?? 60000,
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      const elapsed = Date.now() - t0
      console.log(`[Tracker] Got ${latitude.toFixed(6)}, ${longitude.toFixed(6)} ±${accuracy?.toFixed(0)}m in ${elapsed}ms`)

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
        console.log(`[Tracker] ✅ Synced (${trigger}) in ${Date.now() - t0}ms`)
      } else {
        console.error(`[Tracker] API error ${res.status}`)
      }
    } catch (err: any) {
      console.warn(`[Tracker] Geo failed (${trigger}):`, err.message)
      try {
        await fetch(SYNC_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            device_info: navigator.userAgent,
            sync_status: 'FAILED',
            failure_reason: err.message || 'Geolocation error',
            trigger,
          }),
        })
      } catch { /* ignore */ }
    }
  }

  return null
}

// ── Service Worker + Push (runs in parallel, non-blocking) ──
async function registerServiceWorkerAndPush(deviceId: string) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[Tracker] SW registered.')
    await navigator.serviceWorker.ready

    if ('PushManager' in window) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
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
      console.log('[Tracker] Push saved.')
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
