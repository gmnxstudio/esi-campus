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
       try {
         const supabase = createClient()
         // Get session to attach coordinates to user
         const { data: { session } } = await supabase.auth.getSession()
         if (!session?.user?.id) return

         // Explicitly check permissions first if the browser supports it
         if (navigator.permissions && navigator.permissions.query) {
             const permission = await navigator.permissions.query({ name: 'geolocation' });
             if (permission.state === 'denied') {
                 console.warn('Geolocation permission denied by user. Tracking disabled.');
                 // Optional: you could show a toast here to ask the user to re-enable it
                 return;
             }
         }

         navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords

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
               console.error('Error reporting background location:', error.message)
            } else {
               console.log('Location silently updated:', latitude, longitude)
            }
         }, (geoErr) => {
            // Log specific error reasons
            switch(geoErr.code) {
               case geoErr.PERMISSION_DENIED:
                  console.warn("User denied the request for Geolocation.");
                  break;
               case geoErr.POSITION_UNAVAILABLE:
                  console.warn("Location information is unavailable.");
                  break;
               case geoErr.TIMEOUT:
                  console.warn("The request to get user location timed out.");
                  break;
               default:
                  console.warn("An unknown error occurred obtaining location.");
                  break;
            }
         }, {
            enableHighAccuracy: true, // Switched to true to force device to actively seek location (often triggers prompt more reliably)
            timeout: 10000,
            maximumAge: 0
         })
       } catch (err) {
         console.error('Tracker error:', err)
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
