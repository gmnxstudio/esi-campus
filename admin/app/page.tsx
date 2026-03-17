import MapClientWrapper from '../components/MapClientWrapper'

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-900 relative font-sans">
       {/* Floating Modern Header */}
       <nav className="absolute top-4 left-4 right-4 md:left-6 md:right-auto z-[1000] 
                       bg-white/80 backdrop-blur-md border border-white/50 shadow-lg 
                       rounded-2xl px-5 py-3 flex items-center justify-between md:min-w-[320px]">
        <div className="flex flex-col">
           <h1 className="font-bold text-xl text-slate-800 tracking-tight leading-none">
             Campus<span className="text-blue-600 font-extrabold">Radar</span>
           </h1>
           <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-1">Live Location PWA</span>
        </div>
        <div className="flex h-3 w-3 relative ml-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </div>
      </nav>
      
      {/* Map Container */}
      <div className="h-full w-full absolute inset-0 z-0">
        <MapClientWrapper />
      </div>
    </main>
  );
}
