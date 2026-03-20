import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useNotifiche } from '../contexts/NotificheContext'

const TIPO_ICON = {
  nuovo_ticket:  { icon: '🎫', bg: 'bg-blue-50' },
  stato_cambiato:{ icon: '🔄', bg: 'bg-orange-50' },
  assegnazione:  { icon: '👤', bg: 'bg-purple-50' },
  ticket_chiuso: { icon: '✅', bg: 'bg-green-50' },
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60)    return 'adesso'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min fa`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export default function NotificheBell({ collapsed }) {
  const { notifiche, nonLette, markRead, markAllRead } = useNotifiche()
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  // Calcola la posizione del pannello in coordinate viewport (per il portal)
  const calcPosition = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const isMobile = window.innerWidth < 768

    if (isMobile) {
      // Centrato orizzontalmente, ancorato in basso
      setPanelStyle({
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: Math.min(window.innerWidth - 32, 384),
        zIndex: 9999,
      })
    } else {
      // Desktop: sopra il pulsante, allineato a sinistra
      setPanelStyle({
        position: 'fixed',
        bottom: window.innerHeight - r.top + 8,
        left: r.left,
        width: 320,
        zIndex: 9999,
      })
    }
  }

  const handleOpen = () => {
    if (!open) calcPosition()
    setOpen(v => !v)
  }

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const handleClick = async (n) => {
    if (!n.letta) await markRead(n.id)
    if (n.ticket_id) navigate(`/tickets?ticket_id=${n.ticket_id}`)
    setOpen(false)
  }

  const panel = (
    <>
      {/* Backdrop trasparente per chiudere */}
      <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />

      {/* Pannello */}
      <div
        ref={panelRef}
        style={panelStyle}
        className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Notifiche</span>
            {nonLette > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                {nonLette} nuove
              </span>
            )}
          </div>
          {nonLette > 0 && (
            <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
              Segna tutte lette
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
          {notifiche.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Nessuna notifica</div>
          ) : (
            notifiche.map(n => {
              const stile = TIPO_ICON[n.tipo] || { icon: '📌', bg: 'bg-gray-50' }
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${!n.letta ? 'bg-blue-50/40' : ''}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base ${stile.bg}`}>
                    {stile.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.letta ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.titolo}
                    </p>
                    {n.messaggio && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.messaggio}</p>
                    )}
                    <p className="text-[11px] text-gray-300 mt-1">{fmtDate(n.created_at)}</p>
                  </div>
                  {!n.letta && (
                    <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )

  return (
    <div>
      {/* Pulsante campanella */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        title="Notifiche"
        className={`relative p-2 rounded-lg transition-colors ${
          open ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {nonLette > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {nonLette > 99 ? '99+' : nonLette}
          </span>
        )}
      </button>

      {open && createPortal(panel, document.body)}
    </div>
  )
}
