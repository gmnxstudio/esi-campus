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

// ── Helper: Human-readable device name ──────────────────────
function getDeviceName(ua: string | null): string {
  if (!ua) return 'Unknown Device'
  if (ua.includes('iPhone')) return '📱 iPhone'
  if (ua.includes('iPad')) return '📱 iPad'
  if (ua.includes('Android')) {
    // Try to extract model name
    const match = ua.match(/;\s*([^;)]+)\s*Build/)
    return match ? `📱 ${match[1].trim()}` : '📱 Android'
  }
  if (ua.includes('Windows')) return '💻 Windows PC'
  if (ua.includes('Macintosh')) return '💻 Mac'
  if (ua.includes('Linux')) return '💻 Linux'
  return '🌐 Web Browser'
}

// ── Helper: Time ago (friendly format) ──────────────────────
function timeAgo(dateStr: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam ${minutes % 60} menit lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

// ── Smart Popup with Reverse Geocoding ──────────────────────
function SmartPopup({ loc, historyCount }: { loc: UserLocation; historyCount: number }) {
  const [address, setAddress] = useState<string>('Memuat alamat...')

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.5' } }
        )
        const data = await res.json()
        setAddress(data?.display_name || 'Alamat tidak ditemukan')
      } catch {
        setAddress('Gagal memuat alamat')
      }
    }
    fetchAddress()
  }, [loc.latitude, loc.longitude])

  const minutes = Math.floor((Date.now() - new Date(loc.last_updated).getTime()) / 60000)

  return (
    <Popup>
      <div className="p-2 min-w-[240px] max-w-[300px]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
              {loc.user_id.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[13px] text-slate-800 leading-tight">
                Device #{loc.user_id.split('-')[0]}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {new Date(loc.last_updated).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ring-2 ring-white shadow-sm ${
            minutes < 20 ? 'bg-green-500' : minutes < 60 ? 'bg-yellow-400' : 'bg-red-400'
          }`}></span>
        </div>

        {/* Info Grid */}
        <div className="space-y-2.5 text-[11px]">
          {/* Address */}
          <div className="flex gap-2">
            <span className="text-blue-500 shrink-0 mt-0.5 text-sm">📍</span>
            <p className="text-slate-700 font-medium leading-snug">{address}</p>
          </div>

          {/* Coordinates */}
          <div className="flex gap-2 items-center">
            <span className="text-blue-500 shrink-0 text-sm">🌐</span>
            <div className="flex gap-3 font-mono text-[10px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1 flex-1">
              <span>{loc.latitude.toFixed(6)}</span>
              <span className="text-slate-300">|</span>
              <span>{loc.longitude.toFixed(6)}</span>
            </div>
          </div>

          {/* Device */}
          <div className="flex gap-2 items-start">
            <span className="text-blue-500 shrink-0 text-sm">💻</span>
            <div>
              <span className="font-semibold text-slate-700 block">{getDeviceName(loc.device_info)}</span>
              <span className="text-[9px] text-slate-400 block truncate max-w-[200px]" title={loc.device_info || ''}>
                {loc.device_info || 'Tidak ada data'}
              </span>
            </div>
          </div>

          {/* Sync Stats */}
          <div className="flex gap-2 items-center pt-2 border-t border-slate-100">
            <span className="text-blue-500 shrink-0 text-sm">📊</span>
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-slate-700">{historyCount} sync hari ini</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{timeAgo(loc.last_updated)}</span>
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
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const { data, error } = await supabase
          .from('location_history')
          .select('id, latitude, longitude, sync_status, recorded_at')
          .gte('recorded_at', todayStart.toISOString())
          .gt('latitude', 0)
          .order('recorded_at', { ascending: true })
        if (error) { console.warn('History table may not exist yet:', error.message); return }
        setHistory(data || [])
      } catch (err) { console.warn('History fetch failed:', err) }
    }

    fetchLocations()
    fetchHistory()

    const channel = supabase
      .channel('location-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => { fetchLocations(); fetchHistory() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Loading State ────────────────────────────────────────
  if (loading) return (
    <div className="flex h-full w-full items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/>
          </svg>
        </div>
        <span className="text-sm text-slate-400 font-medium">Memuat peta...</span>
      </div>
    </div>
  )
  
  // ── Error State ──────────────────────────────────────────
  if (error) return (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6">
       <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-6 text-sm max-w-md text-center">
          <p className="font-bold mb-1">Koneksi Gagal</p>
          <p className="text-red-400/70 text-xs">{error}</p>
       </div>
    </div>
  )

  const defaultCenter: [number, number] = locations.length > 0 
    ? [locations[0].latitude, locations[0].longitude] 
    : [-6.200000, 106.816666]

  const trailPositions: [number, number][] = history
    .filter(h => h.latitude !== 0 && h.longitude !== 0)
    .map(h => [h.latitude, h.longitude] as [number, number])

  const todaySyncCount = history.length
  const failedSyncs = history.filter(h => h.sync_status === 'FAILED').length
  const successRate = todaySyncCount > 0 ? Math.round(((todaySyncCount - failedSyncs) / todaySyncCount) * 100) : 0

  return (
    <div className="h-full w-full relative">
       {/* Custom popup and leaflet styles */}
       <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
           border-radius: 16px !important;
           padding: 0 !important;
           box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08) !important;
           border: 1px solid rgba(226, 232, 240, 0.6) !important;
           overflow: hidden;
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important; }
        .leaflet-container { font-family: 'Inter', system-ui, sans-serif; }
        .leaflet-control-zoom { border-radius: 12px !important; overflow: hidden; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
        .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 16px !important; color: #334155 !important; border-color: #e2e8f0 !important; }
        .leaflet-control-zoom a:hover { background: #f1f5f9 !important; }
      `}} />

      <MapContainer 
        center={defaultCenter} 
        zoom={16} 
        scrollWheelZoom={true} 
        zoomControl={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        {/* ── OpenStreetMap Tiles (detailed street names) ── */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* History Trail Polyline */}
        {trailPositions.length > 1 && (
          <Polyline
            positions={trailPositions}
            pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.5, dashArray: '10 6' }}
          />
        )}

        {/* Current Location Markers */}
        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
            <SmartPopup loc={loc} historyCount={todaySyncCount} />
          </Marker>
        ))}
      </MapContainer>
      
      {/* ── Floating Info Panel ──────────────────────────── */}
      <div className="absolute bottom-4 left-3 right-3 
                      md:top-20 md:bottom-auto md:left-4 md:right-auto md:w-[320px]
                      bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 z-[1000]
                      flex flex-col max-h-[38vh] md:max-h-[75vh] overflow-hidden">
        
        {/* Panel Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-[13px]">Monitoring Panel</h3>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl p-2 text-center">
              <div className="text-base font-extrabold text-blue-600">{locations.length}</div>
              <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Device</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl p-2 text-center">
              <div className="text-base font-extrabold text-emerald-600">{todaySyncCount}</div>
              <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Sync</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-xl p-2 text-center">
              <div className="text-base font-extrabold text-amber-600">{successRate}%</div>
              <div className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Sukses</div>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="px-3 py-2 overflow-y-auto flex-1">
          {locations.map(loc => {
             const minutes = Math.floor((Date.now() - new Date(loc.last_updated).getTime()) / 60000)
             let statusColor = 'bg-green-500'
             let statusLabel = 'Aktif'
             let statusBg = 'bg-green-50 text-green-700'
             if (minutes > 20) { statusColor = 'bg-yellow-400'; statusLabel = 'Idle'; statusBg = 'bg-yellow-50 text-yellow-700' }
             if (minutes > 60) { statusColor = 'bg-red-400'; statusLabel = 'Offline'; statusBg = 'bg-red-50 text-red-600' }

             return (
              <div key={loc.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group mb-1">
                 <div className="relative shrink-0">
                   <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:border-blue-300 transition-colors">
                     <span className="text-[11px] font-bold text-slate-500">{loc.user_id.substring(0, 2).toUpperCase()}</span>
                   </div>
                   <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColor} ring-2 ring-white`}></span>
                 </div>
                 <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[11px] text-slate-800 truncate">
                        Device #{loc.user_id.split('-')[0]}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${statusBg}`}>{statusLabel}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {getDeviceName(loc.device_info)} · {timeAgo(loc.last_updated)}
                    </span>
                 </div>
              </div>
             )
          })}
          {locations.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
               <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                 <span className="text-2xl">📡</span>
               </div>
               <span className="text-xs text-slate-500 font-semibold">Belum ada sinyal.</span>
               <span className="text-[10px] text-slate-400 mt-1">Menunggu sync pulse pertama...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
