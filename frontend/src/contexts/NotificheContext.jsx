import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { notificheApi } from '../api/client'
import { useAuth } from './AuthContext'

const NotificheContext = createContext(null)

const POLL_INTERVAL = 30_000 // 30 secondi

// ── Audio ─────────────────────────────────────────────────────────────────────
// AudioContext viene creato solo al primo gesto utente (autoplay policy).
// _audioUnlocked = true dopo il primo click/keydown/touchend.

let _audioCtx = null
let _audioUnlocked = false

function _unlockAudio() {
  _audioUnlocked = true
  if (_audioCtx) { try { _audioCtx.resume() } catch {} }
}
document.addEventListener('click',   _unlockAudio, { capture: true })
document.addEventListener('keydown',  _unlockAudio, { capture: true })
document.addEventListener('touchend', _unlockAudio, { capture: true })

/** Suono di notifica generato via Web Audio API (nessun file esterno). */
function playNotificationSound() {
  if (!_audioUnlocked) return   // nessun gesto utente ancora
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = _audioCtx
    if (ctx.state === 'suspended') ctx.resume()
    if (ctx.state !== 'running') return

    const play = (freq, startTime, duration, gain = 0.3) => {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.connect(vol)
      vol.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      vol.gain.setValueAtTime(0, startTime)
      vol.gain.linearRampToValueAtTime(gain, startTime + 0.01)
      vol.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const t = ctx.currentTime
    play(880,  t,        0.15)   // La5 — prima nota
    play(1109, t + 0.12, 0.20)   // Re6 — seconda nota
  } catch {
    // Browser senza Web Audio API: silenzioso
  }
}

export function NotificheProvider({ children }) {
  const { user, activeOrg, isProprietario } = useAuth()
  const [notifiche, setNotifiche] = useState([])
  const [nonLette, setNonLette] = useState(0)
  const timerRef = useRef(null)
  const knownIdsRef = useRef(null) // null = primo caricamento, non suonare

  const fetch = useCallback(async () => {
    if (!user) return
    if (isProprietario && !activeOrg) return
    try {
      const res = await notificheApi.list()
      const items = res.data.items

      // Rileva notifiche nuove rispetto al poll precedente
      if (knownIdsRef.current !== null) {
        const newOnes = items.filter(n => !knownIdsRef.current.has(n.id))
        if (newOnes.length > 0) playNotificationSound()
      }
      knownIdsRef.current = new Set(items.map(n => n.id))

      setNotifiche(items)
      setNonLette(res.data.non_lette)
    } catch {
      // silenzioso — l'utente non deve vedere errori di polling
    }
  }, [user])

  // Polling automatico
  useEffect(() => {
    if (!user || (isProprietario && !activeOrg)) {
      setNotifiche([])
      setNonLette(0)
      knownIdsRef.current = null
      return
    }
    fetch()
    timerRef.current = setInterval(fetch, POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [user, activeOrg, isProprietario, fetch])

  const markRead = useCallback(async (id) => {
    await notificheApi.markRead(id)
    setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letta: true } : n))
    setNonLette(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await notificheApi.markAllRead()
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })))
    setNonLette(0)
  }, [])

  return (
    <NotificheContext.Provider value={{ notifiche, nonLette, fetch, markRead, markAllRead }}>
      {children}
    </NotificheContext.Provider>
  )
}

export function useNotifiche() {
  return useContext(NotificheContext)
}
