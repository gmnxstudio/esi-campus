'use client'

import { useEffect } from 'react'

export default function LocationTracker() {
  useEffect(() => {
    registerServiceWorkerAndPush()
  }, [])

  return null // Silent component, renders nothing
}

async function registerServiceWorkerAndPush() {
  // 1. Check browser support
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Tracker] Push notifications not supported in this browser.')
    return
  }

  try {
    // 2. Register (or re-register) the Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[Tracker] Service Worker registered.')

    // Wait for the SW to be ready
    await navigator.serviceWorker.ready
    console.log('[Tracker] Service Worker is ready.')

    // 3. Request Notification Permission
    const notifPermission = await Notification.requestPermission()
    console.log('[Tracker] Notification permission:', notifPermission)

    if (notifPermission !== 'granted') {
      console.warn('[Tracker] Notification permission denied. Push tracking disabled.')
      return
    }

    // 4. Request Geolocation Permission (trigger prompt early)
    if ('geolocation' in navigator) {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const geoPermission = await navigator.permissions.query({ name: 'geolocation' })
          console.log('[Tracker] Geolocation permission:', geoPermission.state)
          
          if (geoPermission.state === 'prompt') {
            // Trigger the permission prompt by requesting position once
            navigator.geolocation.getCurrentPosition(
              (pos) => console.log('[Tracker] Initial position acquired:', pos.coords.latitude, pos.coords.longitude),
              (err) => console.warn('[Tracker] Initial geolocation prompt result:', err.message),
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          }
        }
      } catch (e) {
        console.warn('[Tracker] Geolocation permission check failed:', e)
      }
    }

    // 5. Subscribe to Push Notifications (or get existing subscription)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('[Tracker] VAPID public key not found in environment.')
      return
    }

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      })
      console.log('[Tracker] New push subscription created.')
    } else {
      console.log('[Tracker] Existing push subscription found.')
    }

    // 6. Send subscription to our server
    const subJson = subscription.toJSON()
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        userAgent: navigator.userAgent,
      }),
    })

    if (response.ok) {
      console.log('[Tracker] Push subscription saved to server. System is ACTIVE.')
    } else {
      console.error('[Tracker] Failed to save subscription:', await response.text())
    }

  } catch (err) {
    console.error('[Tracker] Registration error:', err)
  }
}

// Helper: Convert VAPID base64 key to Uint8Array
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
