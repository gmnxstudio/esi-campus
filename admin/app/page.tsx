import MapClientWrapper from '../components/MapClientWrapper'

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col">
       <nav className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shadow-sm z-50">
        <h1 className="font-bold text-lg text-slate-800 tracking-tight">Campus<span className="text-slate-400 font-medium">Admin</span></h1>
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-500 font-medium">
          <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600">Public Live Map</span>
        </div>
      </nav>
      <div className="flex-1 relative">
        <MapClientWrapper />
      </div>
    </main>
  );
}
