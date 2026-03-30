'use client'

import { useEffect, useState } from 'react'

const SW_VERSION_KEY = 'praishe_sw_version'

export default function UpdateModal() {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Method 1: Detect SW controller change (new SW activated)
    const handleControllerChange = () => {
      console.log('[UpdateModal] New Service Worker activated!')
      checkForUpdate()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Method 2: Query SW version via postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_VERSION') {
        const newVersion = event.data.version
        const storedVersion = localStorage.getItem(SW_VERSION_KEY)

        console.log('[UpdateModal] SW version:', newVersion, 'Stored:', storedVersion)

        if (storedVersion && storedVersion !== newVersion) {
          // Version changed = new deployment!
          setShowModal(true)
        }
        // Always save the current version
        localStorage.setItem(SW_VERSION_KEY, newVersion)
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)

    // Ask the SW for its version on load
    const askVersion = async () => {
      const reg = await navigator.serviceWorker.ready
      reg.active?.postMessage({ type: 'GET_VERSION' })
    }
    askVersion()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  const checkForUpdate = () => {
    // After controller changes, ask for new version
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'GET_VERSION' })
    })
  }

  const handleDismiss = () => {
    setShowModal(false)
  }

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-slideUp">
        {/* Icon Header */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-8 pb-6 text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
              <path d="m14 7 3 3" />
              <path d="M5 6v4" />
              <path d="M19 14v4" />
              <path d="M10 2v2" />
              <path d="M7 8H3" />
              <path d="M21 16h-4" />
              <path d="M11 3H9" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-1">Aplikasi Diperbarui! 🎉</h2>
          <p className="text-blue-100 text-sm">Versi terbaru telah terinstal</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            <strong className="text-slate-800">Praishe's Campus</strong> telah diupgrade ke versi terbaru.
            Untuk memastikan semua fitur berjalan optimal, silakan:
          </p>

          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-sm">1</div>
              <p className="text-sm text-slate-600 pt-0.5">
                Tambahkan kembali ke <strong>Home Screen</strong> perangkat Anda
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-sm">2</div>
              <p className="text-sm text-slate-600 pt-0.5">
                Berikan izin <strong>Perangkat</strong> dan <strong>Notifikasi</strong> kembali
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
          >
            Mengerti, Lanjutkan
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
      `}</style>
    </div>
  )
}
