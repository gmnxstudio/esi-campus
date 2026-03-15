'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// 15 minutes = 15 * 60 * 1000 = 900000 ms
const TRACKING_INTERVAL = 15 * 60 * 1000 

export default function LocationTracker() {
  useEffect(() => {
    // Basic check for Geolocation API
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported by your browser')
      return
    }

    const reportLocation = async () => {
       console.log('[Tracker] Starting reportLocation cycle...');
       try {
         const supabase = createClient()
         // Get session to attach coordinates to user
         const { data: { session }, error: sessionError } = await supabase.auth.getSession()
         
         if (sessionError) {
            console.error('[Tracker] Error getting Supabase session:', sessionError);
            return;
         }

         if (!session?.user?.id) {
            console.warn('[Tracker] User is NOT logged in. Location tracking requires an active user session. Aborting.');
            return;
         }
         
         console.log('[Tracker] User session found. UUID:', session.user.id);

         // Explicitly check permissions first if the browser supports it
         if (navigator.permissions && navigator.permissions.query) {
             const permission = await navigator.permissions.query({ name: 'geolocation' });
             console.log('[Tracker] Geolocation permission status:', permission.state);
             if (permission.state === 'denied') {
                 console.warn('[Tracker] Geolocation permission denied by user. Tracking disabled.');
                 return;
             }
         }

         console.log('[Tracker] Requesting navigator.geolocation.getCurrentPosition...');
         navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords
            console.log(`[Tracker] Position obtained - Lat: ${latitude}, Lng: ${longitude}. Upserting to Supabase...`);

            // Upsert into Supabase
            const { error } = await supabase
              .from('user_locations')
              .upsert({
                 user_id: session.user.id,
                 latitude: latitude,
                 longitude: longitude,
                 last_updated: new Date().toISOString()
              }, { onConflict: 'user_id' }) // ensure user_id is UNIQUE or Primary Key in DB

            if (error) {
               console.error('[Tracker] Error reporting background location to Supabase:', error.message)
            } else {
               console.log('[Tracker] SUCCESS: Location silently updated in Supabase.')
            }
         }, (geoErr) => {
            // Log specific error reasons
            console.error('[Tracker] Geolocation Error Code:', geoErr.code, '-', geoErr.message);
            switch(geoErr.code) {
               case geoErr.PERMISSION_DENIED:
                  console.warn("[Tracker] User denied the request for Geolocation.");
                  break;
               case geoErr.POSITION_UNAVAILABLE:
                  console.warn("[Tracker] Location information is unavailable.");
                  break;
               case geoErr.TIMEOUT:
                  console.warn("[Tracker] The request to get user location timed out.");
                  break;
               default:
                  console.warn("[Tracker] An unknown error occurred obtaining location.");
                  break;
            }
         }, {
            enableHighAccuracy: true, // Switched to true to force device to actively seek location (often triggers prompt more reliably)
            timeout: 10000,
            maximumAge: 0
         })
       } catch (err) {
         console.error('[Tracker] Fatal Tracker error:', err)
       }
    }

    // Report immediately on mount/load
    reportLocation()

    // Then set interval for 15 minutes
    const interval = setInterval(reportLocation, TRACKING_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Silent component, renders nothing
  return null
}
