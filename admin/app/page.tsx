import MapClientWrapper from '../components/MapClientWrapper'

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-white">
       {/* ── Solid Top Header Bar ────────────────────────── */}
       <header className="shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 z-[1000] shadow-sm">
         <div className="flex items-center justify-between max-w-7xl mx-auto">
           {/* Left: Brand */}
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <circle cx="12" cy="10" r="3"/>
                 <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/>
               </svg>
             </div>
             <div>
               <h1 className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                 Campus<span className="text-blue-600">Radar</span>
               </h1>
               <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                 Live Tracking Dashboard
               </p>
             </div>
           </div>

           {/* Right: Status */}
           <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
               </svg>
               Setiap 15 menit
             </div>
             <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               Active
             </div>
           </div>
         </div>
       </header>

       {/* ── Map Container (fills remaining space) ──── */}
       <div className="flex-1 relative z-0">
         <MapClientWrapper />
       </div>
    </main>
  );
}
