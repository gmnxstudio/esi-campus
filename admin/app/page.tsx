import MapClientWrapper from '../components/MapClientWrapper'

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 relative">
       {/* ── Floating Top Bar ────────────────────────────── */}
       <nav className="absolute top-0 left-0 right-0 z-[1000] 
                       bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-transparent
                       px-4 md:px-6 pt-4 pb-12 pointer-events-none">
         <div className="flex items-center justify-between pointer-events-auto max-w-7xl mx-auto">
           {/* Left: Brand */}
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <circle cx="12" cy="10" r="3"/>
                 <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/>
               </svg>
             </div>
             <div>
               <h1 className="font-extrabold text-lg text-white tracking-tight leading-none">
                 Campus<span className="text-blue-400">Radar</span>
               </h1>
               <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                 Live Tracking Dashboard
               </p>
             </div>
           </div>

           {/* Right: Status Badges */}
           <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-md">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                 <path d="M12 2v10l4.24 4.24"/>
                 <circle cx="12" cy="12" r="10"/>
               </svg>
               Sync Interval: 15 min
             </div>
             <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               Active
             </div>
           </div>
         </div>
       </nav>

       {/* ── Map Container (Full Screen underneath) ──── */}
       <div className="h-full w-full absolute inset-0 z-0">
         <MapClientWrapper />
       </div>
    </main>
  );
}
