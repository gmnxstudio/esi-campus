'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
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
}

type HistoryPoint = {
  id: string
  latitude: number
  longitude: number
  sync_status: string
  recorded_at: string
}

// ── Smart Popup with Reverse Geocoding ──────────────────────
function SmartPopup({ loc, historyCount }: { loc: UserLocation; historyCount: number }) {
  const [address, setAddress] = useState<string>('Loading address...')

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`, {
          headers: { 'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7' }
        })
        const data = await res.json()
        setAddress(data?.display_name || 'Address not found')
      } catch {
        setAddress('Unable to fetch address')
      }
    }
    fetchAddress()
  }, [loc.latitude, loc.longitude])

  const getDeviceName = (ua: string | null) => {
    if (!ua) return 'Unknown Device'
    if (ua.includes('iPhone')) return 'iPhone Safari'
    if (ua.includes('iPad')) return 'iPad Safari'
    if (ua.includes('Android')) return 'Android Device'
    if (ua.includes('Windows')) return 'Windows PC'
    if (ua.includes('Macintosh')) return 'Macbook / iMac'
    return 'Web Browser'
  }

  const timeAgoMinutes = Math.floor((Date.now() - new Date(loc.last_updated).getTime()) / 60000)

  return (
    <Popup>
      <div className="p-1 min-w-[220px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {loc.user_id.substring(0, 2).toUpperCase()}
          </div>
          <div>
             <p className="font-bold text-sm text-slate-800 leading-tight">User</p>
             <p className="text-[10px] text-slate-500 font-medium">
                {new Date(loc.last_updated).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
             </p>
          </div>
          <div className="ml-auto">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${timeAgoMinutes < 20 ? 'bg-green-500' : timeAgoMinutes < 60 ? 'bg-yellow-500' : 'bg-red-400'}`}></span>
          </div>
        </div>

        {/* Details */}
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
                    {loc.device_info || 'No device data'}
                 </span>
              </div>
           </div>

           <div className="flex items-start gap-2 pt-1 border-t border-slate-50">
              <span className="text-slate-400 mt-0.5">🌐</span>
              <div className="flex flex-col flex-1 font-mono text-[9px] text-slate-500">
                <span>Lat: {loc.latitude.toFixed(6)}</span>
                <span>Lng: {loc.longitude.toFixed(6)}</span>
              </div>
           </div>

           <div className="flex items-start gap-2 pt-1 border-t border-slate-50">
              <span className="text-slate-400 mt-0.5">📊</span>
              <div className="flex-1">
                <span className="font-medium text-slate-700 block">{historyCount} sync(s) today</span>
                <span className="text-[9px] text-slate-400">
                  {timeAgoMinutes < 1 ? 'Just now' : timeAgoMinutes < 60 ? `${timeAgoMinutes} min ago` : `${Math.floor(timeAgoMinutes / 60)}h ${timeAgoMinutes % 60}m ago`}
                </span>
              </div>
           </div>
        </div>
      </div>
    </Popup>
  )
}

// ── Main Map Component ──────────────────────────────────────
export default function MapComponent({ adminEmail }: { adminEmail: string }) {
  const [locations, setLocations] = useState<UserLocation[]>([])
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_locations')
          .select('id, user_id, latitude, longitude, device_info, last_updated')
          .order('last_updated', { ascending: false })
        
        if (error) throw error
        
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

    const fetchHistory = async () => {
      try {
        // Get today's history for daily trail
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const { data, error } = await supabase
          .from('location_history')
          .select('id, latitude, longitude, sync_status, recorded_at')
          .gte('recorded_at', todayStart.toISOString())
          .gt('latitude', 0) // Only valid coordinates
          .order('recorded_at', { ascending: true })
        
        if (error) {
          console.warn('History table may not exist yet:', error.message)
          return
        }

        setHistory(data || [])
      } catch (err) {
        console.warn('History fetch failed:', err)
      }
    }

    fetchLocations()
    fetchHistory()

    // Realtime subscription
    const channel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        () => { fetchLocations(); fetchHistory(); }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) return (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400 animate-pulse">
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

  const defaultCenter: [number, number] = locations.length > 0 
    ? [locations[0].latitude, locations[0].longitude] 
    : [-6.200000, 106.816666]

  // Build polyline from today's history
  const trailPositions: [number, number][] = history
    .filter(h => h.latitude !== 0 && h.longitude !== 0)
    .map(h => [h.latitude, h.longitude] as [number, number])

  const todaySyncCount = history.length
  const failedSyncs = history.filter(h => h.sync_status === 'FAILED').length

  return (
    <div className="h-full w-full relative">
       <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
           border-radius: 16px;
           box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
           border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .leaflet-popup-tip { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
        .leaflet-container { font-family: inherit; }
      `}} />

      <MapContainer 
        center={defaultCenter} 
        zoom={14} 
        scrollWheelZoom={true} 
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* History Trail Polyline */}
        {trailPositions.length > 1 && (
          <Polyline
            positions={trailPositions}
            pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.6, dashArray: '8 4' }}
          />
        )}

        {/* Current Location Markers */}
        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
            <SmartPopup loc={loc} historyCount={todaySyncCount} />
          </Marker>
        ))}
      </MapContainer>
      
      {/* Floating Info Panel */}
      <div className="absolute bottom-6 left-4 right-4 md:auto md:top-24 md:left-6 md:right-auto md:w-80 
                      bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/50 z-[1000] 
                      transition-all hover:shadow-2xl flex flex-col max-h-[40vh] md:max-h-[70vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 shrink-0">
           <h3 className="font-bold text-slate-800 text-sm">Sync Dashboard</h3>
           <div className="flex items-center gap-2 bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              LIVE
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-4 shrink-0">
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-blue-600">{locations.length}</div>
            <div className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider">Devices</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-600">{todaySyncCount}</div>
            <div className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">Syncs</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-rose-500">{failedSyncs}</div>
            <div className="text-[9px] font-semibold text-rose-400 uppercase tracking-wider">Failed</div>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3 overflow-y-auto pr-1">
          {locations.map(loc => {
             const timeAgoMinutes = Math.floor((Date.now() - new Date(loc.last_updated).getTime()) / 60000)
             let statusColor = "bg-green-500"
             let statusText = "Active"
             if (timeAgoMinutes > 20) { statusColor = "bg-yellow-500"; statusText = "Idle" }
             if (timeAgoMinutes > 60) { statusColor = "bg-red-400"; statusText = "Offline" }

             return (
              <div key={loc.user_id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                 <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 group-hover:border-blue-200 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
                 </div>
                 <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-800 truncate">
                        {loc.user_id.split('-')[0]}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                        statusText === 'Active' ? 'bg-green-100 text-green-700' : 
                        statusText === 'Idle' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
                      }`}>{statusText}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                       {timeAgoMinutes < 1 ? 'Synced just now' : `${timeAgoMinutes} min ago`}
                    </span>
                 </div>
              </div>
             )
          })}
          {locations.length === 0 && (
            <div className="flex flex-col items-center justify-center p-6 text-center opacity-60">
               <span className="text-3xl mb-2">📡</span>
               <span className="text-xs text-slate-500 font-medium">No signals detected yet.</span>
               <span className="text-[9px] text-slate-400 mt-1">Waiting for first sync pulse...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
