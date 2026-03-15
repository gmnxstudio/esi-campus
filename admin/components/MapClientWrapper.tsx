'use client'

import dynamic from 'next/dynamic'

// Leaflet MUST be loaded dynamically with SSR disabled because it requires window object
const DynamicMap = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-500 animate-pulse">Initializing Tracker...</div>
})

export default function MapClientWrapper() {
  return <DynamicMap adminEmail="public" />
}
