'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'

// Fix missing marker icons in leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

type UserLocation = {
  id: string
  user_id: string
  latitude: number
  longitude: number
  last_updated: string
  profiles?: {
    email?: string
  }
}

export default function MapComponent({ adminEmail }: { adminEmail: string }) {
  const [locations, setLocations] = useState<UserLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. Fetch initial locations
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_locations')
          .select(`
            id, user_id, latitude, longitude, last_updated
          `)
          .order('last_updated', { ascending: false })
        
        if (error) throw error
        
        // Remove duplicates per user (keep latest)
        const uniqueUsers = new Map<string, UserLocation>()
        data?.forEach((loc: any) => {
          if (!uniqueUsers.has(loc.user_id)) {
            uniqueUsers.set(loc.user_id, loc)
          }
        })
        
        setLocations(Array.from(uniqueUsers.values()))
      } catch (err: any) {
        console.error('Error fetching locations:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()

    // 2. Subscribe to realtime updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all inserts/updates
          schema: 'public',
          table: 'user_locations'
        },
        async (payload: any) => {
          // Re-fetch to get profile info easily (or we could fetch just the profile)
          fetchLocations() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <div className="flex h-screen items-center justify-center">Loading map...</div>
  if (error) return <div className="flex justify-center p-4 text-red-500">Error: {error}</div>

  // Default center (Jakarta or user's first loc)
  const defaultCenter: [number, number] = locations.length > 0 
    ? [locations[0].latitude, locations[0].longitude] 
    : [-6.200000, 106.816666]

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.latitude, loc.longitude]}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-sm mb-1">{loc.profiles?.email || loc.user_id}</p>
                <p className="text-xs text-slate-500">
                  Last seen: {new Date(loc.last_updated).toLocaleString()}
                </p>
                <div className="flex flex-col text-xs text-slate-400 mt-2">
                  <span>Lat: {loc.latitude}</span>
                  <span>Lng: {loc.longitude}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend / Info Box */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 z-[1000] min-w-[200px]">
        <h3 className="font-semibold text-sm mb-2 text-slate-800">Active Users Tracker</h3>
        <div className="flex items-center gap-2 mb-3">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
           <span className="text-xs text-slate-600">Realtime Active</span>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {locations.map(loc => (
            <div key={loc.user_id} className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <span className="font-medium text-slate-700 block truncate">{loc.profiles?.email || loc.user_id}</span>
              <span className="text-slate-400">{new Date(loc.last_updated).toLocaleTimeString()}</span>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="text-xs text-slate-500 italic">No users found</div>
          )}
        </div>
      </div>
    </div>
  )
}
