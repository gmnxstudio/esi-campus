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
  device_info: string | null
  last_updated: string
  profiles?: {
    email?: string
  }
}

// A smart component that fetches address when the popup is opened
function SmartPopup({ loc }: { loc: UserLocation }) {
  const [address, setAddress] = useState<string>('Loading address...')

  useEffect(() => {
    // Reverse Geocoding via Nominatim
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`, {
          headers: { 'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7' } // Prefer Indonesian
        })
        const data = await res.json()
        if (data && data.display_name) {
          setAddress(data.display_name)
        } else {
          setAddress('Address not found')
        }
      } catch (err) {
        setAddress('Unable to fetch address')
      }
    }
    fetchAddress()
  }, [loc.latitude, loc.longitude])

  // Extract a readable device name (fallback for long User-Agent strings)
  const getDeviceName = (ua: string | null) => {
    if (!ua) return 'Unknown Device'
    if (ua.includes('iPhone')) return 'iPhone Safari'
    if (ua.includes('iPad')) return 'iPad Safari'
    if (ua.includes('Android')) return 'Android Device'
    if (ua.includes('Windows')) return 'Windows PC'
    if (ua.includes('Macintosh')) return 'Macbook / iMac'
    return 'Web Browser'
  }

  return (
    <Popup className="custom-popup">
      <div className="p-1 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {loc.profiles?.email ? loc.profiles.email.substring(0, 2).toUpperCase() : 'UI'}
          </div>
          <div>
             <p className="font-bold text-sm text-slate-800 leading-tight">
               {loc.profiles?.email || loc.user_id.split('-')[0]}
             </p>
             <p className="text-[10px] text-slate-500 font-medium">
                {new Date(loc.last_updated).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
             </p>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-2 text-xs text-slate-600">
           <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">📍</span>
              <span className="flex-1 font-medium text-slate-700 leading-tight">{address}</span>
           </div>
           
           <div className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">💻</span>
              <div className="flex-1">
                 <span className="font-medium text-slate-700 block">{getDeviceName(loc.device_info)}</span>
                 <span className="text-[9px] text-slate-400 block truncate max-w-[180px]" title={loc.device_info || ''}>
                    {loc.device_info || 'No strict UA data'}
                 </span>
              </div>
           </div>

           <div className="flex items-start gap-2 pt-1 border-t border-slate-50 mt-2">
              <span className="text-slate-400 mt-0.5">🌐</span>
              <div className="flex flex-col flex-1 font-mono text-[9px] text-slate-500">
                <span>Lat: {loc.latitude.toFixed(6)}</span>
                <span>Lng: {loc.longitude.toFixed(6)}</span>
              </div>
           </div>
        </div>
      </div>
    </Popup>
  )
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
            id, user_id, latitude, longitude, device_info, last_updated
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
          // Re-fetch to get new data
          fetchLocations() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 border border-white/10 text-slate-400 animate-pulse">
       Loading radar data...
    </div>
  )
  
  if (error) return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 p-6">
       <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 text-sm max-w-md text-center">
          Connection Error: {error}
       </div>
    </div>
  )

  // Default center (Jakarta or user's first loc)
  const defaultCenter: [number, number] = locations.length > 0 
    ? [locations[0].latitude, locations[0].longitude] 
    : [-6.200000, 106.816666]

  return (
    <div className="h-full w-full relative">
       {/* Global style to force popup styling */}
       <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
           border-radius: 16px;
           box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
           border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .leaflet-popup-tip {
           box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .leaflet-container {
           font-family: inherit;
        }
      `}} />

      <MapContainer 
        center={defaultCenter} 
        zoom={14} 
        scrollWheelZoom={true} 
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Modern looking light map tile
        />
        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.latitude, loc.longitude]}
          >
            <SmartPopup loc={loc} />
          </Marker>
        ))}
      </MapContainer>
      
      {/* Floating Modern Legend / Info Box Mobile First */}
      <div className="absolute bottom-6 left-4 right-4 md:auto md:top-24 md:left-6 md:right-auto md:w-80 
                      bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/50 z-[1000] 
                      transition-all hover:shadow-2xl flex flex-col max-h-[40vh] md:max-h-[70vh]">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 shrink-0">
           <h3 className="font-bold text-slate-800 text-sm">Active Trackers</h3>
           <div className="flex items-center gap-2 bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              LIVE
           </div>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          {locations.map(loc => {
             const timeAgoMinutes = Math.floor((new Date().getTime() - new Date(loc.last_updated).getTime()) / 60000);
             let statusColor = "bg-green-500";
             if (timeAgoMinutes > 30) statusColor = "bg-yellow-500";
             if (timeAgoMinutes > 120) statusColor = "bg-slate-300";

             return (
              <div key={loc.user_id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 group-hover:border-blue-200 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                 </div>
                 <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-xs text-slate-800 truncate">
                      {loc.profiles?.email || loc.user_id.split('-')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                       {timeAgoMinutes < 1 ? 'Just now' : `${timeAgoMinutes} mins ago`}
                    </span>
                 </div>
              </div>
             )
          })}
          {locations.length === 0 && (
            <div className="flex flex-col items-center justify-center p-6 text-center opacity-60">
               <span className="text-3xl mb-2">📡</span>
               <span className="text-xs text-slate-500 font-medium">No signals detected yet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
