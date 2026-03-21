import { useState, useEffect, useRef, useCallback } from 'react'
import { eventiApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

// ─── Utilities ──────────────────────────────────────────────────────────────

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

function parseDate(str) {
  // "YYYY-MM-DD" → local Date
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function weekStart(d) {
  const r = new Date(d)
  const dow = r.getDay() // 0=sun
  const diff = dow === 0 ? -6 : 1 - dow // Monday-based
  r.setDate(r.getDate() + diff)
  return r
}

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

// Returns array of 42 Date objects (6 weeks) for calendar month grid
function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const dow = first.getDay() // 0=sun
  const offset = dow === 0 ? 6 : dow - 1 // steps back to Monday
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

const COLORS = [
  '#4285f4','#0f9d58','#f4b400','#db4437','#9c27b0',
  '#00acc1','#ff7043','#7cb342','#e91e63','#795548',
]

// ─── EventModal ──────────────────────────────────────────────────────────────

function EventModal({ event, defaultDate, onSave, onDelete, onClose }) {
  const isEdit = Boolean(event?.id)
  const { user } = useAuth()

  const [form, setForm] = useState(() => ({
    titolo: event?.titolo ?? '',
    descrizione: event?.descrizione ?? '',
    data_inizio: event?.data_inizio ?? (defaultDate ? toDateStr(defaultDate) : toDateStr(new Date())),
    ora_inizio: event?.ora_inizio ?? '',
    data_fine: event?.data_fine ?? (defaultDate ? toDateStr(defaultDate) : toDateStr(new Date())),
    ora_fine: event?.ora_fine ?? '',
    tutto_il_giorno: event?.tutto_il_giorno ?? true,
    condiviso: event?.condiviso ?? false,
    colore: event?.colore ?? '#4285f4',
  }))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titolo.trim()) { setErr('Il titolo è obbligatorio'); return }
    if (form.data_fine < form.data_inizio) { setErr('La data fine deve essere ≥ data inizio'); return }
    setSaving(true); setErr('')
    try {
      const payload = { ...form }
      if (form.tutto_il_giorno) { payload.ora_inizio = null; payload.ora_fine = null }
      if (isEdit) {
        const res = await eventiApi.update(event.id, payload)
        onSave(res.data)
      } else {
        const res = await eventiApi.create(payload)
        onSave(res.data)
      }
    } catch (e) {
      setErr(e.response?.data?.detail || 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Eliminare questo evento?')) return
    setDeleting(true)
    try {
      await eventiApi.delete(event.id)
      onDelete(event.id)
    } catch {
      setErr('Errore nell\'eliminazione')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Color strip */}
        <div className="h-2" style={{ background: form.colore }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Modifica evento' : 'Nuovo evento'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <input
              autoFocus
              value={form.titolo}
              onChange={e => set('titolo', e.target.value)}
              placeholder="Titolo evento"
              className="w-full text-lg font-medium border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-2 transition-colors"
            />

            {/* All day toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('tutto_il_giorno', !form.tutto_il_giorno)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.tutto_il_giorno ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.tutto_il_giorno ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-gray-700">Tutto il giorno</span>
            </label>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Inizio</label>
                <input type="date" value={form.data_inizio} onChange={e => { set('data_inizio', e.target.value); if (e.target.value > form.data_fine) set('data_fine', e.target.value) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                {!form.tutto_il_giorno && (
                  <input type="time" value={form.ora_inizio} onChange={e => set('ora_inizio', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fine</label>
                <input type="date" value={form.data_fine} min={form.data_inizio} onChange={e => set('data_fine', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                {!form.tutto_il_giorno && (
                  <input type="time" value={form.ora_fine} onChange={e => set('ora_fine', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                )}
              </div>
            </div>

            {/* Description */}
            <textarea
              value={form.descrizione}
              onChange={e => set('descrizione', e.target.value)}
              placeholder="Descrizione (opzionale)"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
            />

            {/* Color picker */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Colore</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('colore', c)}
                    className={`w-7 h-7 rounded-full transition-transform ${form.colore === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Shared toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-gray-50 rounded-xl">
              <div
                onClick={() => set('condiviso', !form.condiviso)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.condiviso ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.condiviso ? 'left-5' : 'left-0.5'}`} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">{form.condiviso ? 'Condiviso con l\'organizzazione' : 'Solo personale'}</div>
                <div className="text-xs text-gray-400">{form.condiviso ? 'Visibile a tutti i membri' : 'Visibile solo a te'}</div>
              </div>
            </label>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex gap-2 pt-1">
              {isEdit && (
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                  {deleting ? '...' : 'Elimina'}
                </button>
              )}
              <button type="button" onClick={onClose} className="ml-auto px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Annulla
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ background: form.colore }}>
                {saving ? 'Salvataggio...' : (isEdit ? 'Salva' : 'Crea')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Event chip ──────────────────────────────────────────────────────────────

function EventChip({ event, onClick, small }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(event) }}
      title={event.titolo}
      className={`w-full text-left rounded px-1.5 py-0.5 text-white truncate font-medium transition-opacity hover:opacity-80 ${small ? 'text-xs' : 'text-xs leading-5'}`}
      style={{ background: event.colore || '#4285f4' }}
    >
      {!event.tutto_il_giorno && event.ora_inizio && (
        <span className="opacity-80 mr-1">{event.ora_inizio}</span>
      )}
      {event.condiviso ? '👥 ' : ''}{event.titolo}
    </button>
  )
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({ year, month, events, today, onDayClick, onEventClick }) {
  const grid = monthGrid(year, month)

  // Map events by date string for fast lookup
  const evByDate = {}
  events.forEach(ev => {
    const start = parseDate(ev.data_inizio)
    const end = parseDate(ev.data_fine)
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const k = toDateStr(d)
      if (!evByDate[k]) evByDate[k] = []
      evByDate[k].push(ev)
    }
  })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="flex-1 grid grid-rows-6 min-h-0">
        {Array.from({ length: 6 }, (_, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
            {grid.slice(wi * 7, wi * 7 + 7).map(day => {
              const key = toDateStr(day)
              const dayEvs = evByDate[key] || []
              const isToday = isSameDay(day, today)
              const isCurrentMonth = day.getMonth() === month
              return (
                <div
                  key={key}
                  onClick={() => onDayClick(day)}
                  className={`border-r border-gray-100 last:border-0 p-1 flex flex-col min-h-0 cursor-pointer group
                    ${isCurrentMonth ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50'}`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium transition-colors
                      ${isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700 group-hover:text-blue-600' : 'text-gray-300'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  {/* Events */}
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvs.slice(0, 3).map(ev => (
                      <EventChip key={`${ev.id}-${key}`} event={ev} onClick={onEventClick} small />
                    ))}
                    {dayEvs.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1">+{dayEvs.length - 3} altri</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Week View ───────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_H = 60 // px per hour

function WeekView({ weekStartDate, events, today, onSlotClick, onEventClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))
  const scrollRef = useRef(null)

  useEffect(() => {
    // Scroll to 7:00
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_H
    }
  }, [weekStartDate])

  // Split: all-day events vs timed
  const allDay = events.filter(ev => ev.tutto_il_giorno)
  const timed = events.filter(ev => !ev.tutto_il_giorno)

  const allDayByDay = {}
  days.forEach(d => { allDayByDay[toDateStr(d)] = [] })
  allDay.forEach(ev => {
    days.forEach(d => {
      if (toDateStr(d) >= ev.data_inizio && toDateStr(d) <= ev.data_fine) {
        allDayByDay[toDateStr(d)].push(ev)
      }
    })
  })

  const timedByDay = {}
  days.forEach(d => { timedByDay[toDateStr(d)] = [] })
  timed.forEach(ev => {
    if (timedByDay[ev.data_inizio]) timedByDay[ev.data_inizio].push(ev)
  })

  const timeToMinutes = (t) => {
    if (!t) return 0
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Column headers */}
      <div className="flex border-b border-gray-200 shrink-0">
        <div className="w-14 shrink-0" />
        {days.map(d => {
          const isToday = isSameDay(d, today)
          return (
            <div key={toDateStr(d)} className="flex-1 text-center py-2 border-l border-gray-100">
              <div className="text-xs text-gray-500 uppercase">{DAYS_SHORT[days.indexOf(d)]}</div>
              <div className={`text-lg font-semibold mx-auto w-9 h-9 flex items-center justify-center rounded-full
                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      {days.some(d => allDayByDay[toDateStr(d)].length > 0) && (
        <div className="flex border-b border-gray-200 shrink-0">
          <div className="w-14 shrink-0 text-right pr-2 py-1">
            <span className="text-xs text-gray-400">tutto il<br/>giorno</span>
          </div>
          {days.map(d => (
            <div key={toDateStr(d)} className="flex-1 border-l border-gray-100 p-1 space-y-0.5">
              {allDayByDay[toDateStr(d)].map(ev => (
                <EventChip key={ev.id} event={ev} onClick={onEventClick} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: `${24 * HOUR_H}px` }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-xs text-gray-400"
                style={{ top: `${h * HOUR_H - 7}px` }}>
                {h === 0 ? '' : `${String(h).padStart(2,'0')}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => {
            const dk = toDateStr(d)
            const isToday = isSameDay(d, today)
            return (
              <div key={dk} className="flex-1 border-l border-gray-100 relative"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const mins = ((e.clientY - rect.top) / HOUR_H) * 60
                  const h = Math.floor(mins / 60)
                  const m = Math.round((mins % 60) / 15) * 15
                  onSlotClick(d, `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
                }}>
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-gray-100"
                    style={{ top: `${h * HOUR_H}px` }} />
                ))}
                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div key={`h${h}`} className="absolute w-full border-t border-gray-50"
                    style={{ top: `${h * HOUR_H + HOUR_H / 2}px` }} />
                ))}

                {/* Now line */}
                {isToday && (
                  <div className="absolute w-full z-10 pointer-events-none"
                    style={{ top: `${(nowMins / 60) * HOUR_H}px` }}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  </div>
                )}

                {/* Timed events */}
                {timedByDay[dk]?.map(ev => {
                  const startM = timeToMinutes(ev.ora_inizio)
                  const endM = ev.ora_fine ? timeToMinutes(ev.ora_fine) : startM + 60
                  const top = (startM / 60) * HOUR_H
                  const height = Math.max(((endM - startM) / 60) * HOUR_H, 20)
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-xs text-white font-medium text-left overflow-hidden hover:opacity-80 transition-opacity z-20"
                      style={{ top, height, background: ev.colore || '#4285f4' }}
                    >
                      <div className="font-semibold truncate">{ev.condiviso ? '👥 ' : ''}{ev.titolo}</div>
                      {ev.ora_inizio && <div className="opacity-80">{ev.ora_inizio}{ev.ora_fine ? ` – ${ev.ora_fine}` : ''}</div>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Mini Calendar ───────────────────────────────────────────────────────────

function MiniCalendar({ year, month, selectedDate, today, events, onDateSelect, onMonthChange }) {
  const grid = monthGrid(year, month)
  const eventDates = new Set(events.flatMap(ev => {
    const result = []
    const s = parseDate(ev.data_inizio)
    const e = parseDate(ev.data_fine)
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) result.push(toDateStr(d))
    return result
  }))

  return (
    <div className="w-56 shrink-0 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => onMonthChange(-1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">{MONTHS_IT[month]} {year}</span>
        <button onClick={() => onMonthChange(1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400">{d[0]}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map(day => {
          const k = toDateStr(day)
          const isToday = isSameDay(day, today)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const hasEv = eventDates.has(k)
          const isCurrent = day.getMonth() === month
          return (
            <button key={k} type="button" onClick={() => onDateSelect(day)}
              className={`relative text-xs w-7 h-7 rounded-full flex items-center justify-center transition-colors mx-auto
                ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-blue-100 text-blue-700 font-bold' : isCurrent ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-50'}`}>
              {day.getDate()}
              {hasEv && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const today = new Date()
  const [view, setView] = useState('month') // 'month' | 'week'
  const [curDate, setCurDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | { event, defaultDate }
  const [filter, setFilter] = useState('all') // 'all' | 'personal' | 'shared'
  const { user } = useAuth()

  // Date range to fetch
  const fetchRange = useCallback(() => {
    if (view === 'month') {
      const grid = monthGrid(curDate.getFullYear(), curDate.getMonth())
      return { da: toDateStr(grid[0]), a: toDateStr(grid[41]) }
    } else {
      const ws = weekStart(curDate)
      return { da: toDateStr(ws), a: toDateStr(addDays(ws, 6)) }
    }
  }, [view, curDate])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const { da, a } = fetchRange()
      const res = await eventiApi.list({ data_da: da, data_a: a })
      setEvents(res.data)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [fetchRange])

  useEffect(() => { loadEvents() }, [loadEvents])

  const filteredEvents = events.filter(ev => {
    if (filter === 'personal') return !ev.condiviso
    if (filter === 'shared') return ev.condiviso
    return true
  })

  // Navigation
  const navigate = (dir) => {
    if (view === 'month') {
      setCurDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1))
    } else {
      setCurDate(d => addDays(d, dir * 7))
    }
  }

  const goToday = () => {
    if (view === 'month') {
      setCurDate(new Date(today.getFullYear(), today.getMonth(), 1))
    } else {
      setCurDate(weekStart(today))
    }
  }

  const headerLabel = () => {
    if (view === 'month') {
      return `${MONTHS_IT[curDate.getMonth()]} ${curDate.getFullYear()}`
    } else {
      const ws = weekStart(curDate)
      const we = addDays(ws, 6)
      if (ws.getMonth() === we.getMonth()) {
        return `${ws.getDate()} – ${we.getDate()} ${MONTHS_IT[ws.getMonth()]} ${ws.getFullYear()}`
      }
      return `${ws.getDate()} ${MONTHS_IT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_IT[we.getMonth()]} ${ws.getFullYear()}`
    }
  }

  const handleDayClick = (day) => {
    setModal({ event: null, defaultDate: day })
  }

  const handleSlotClick = (day, time) => {
    setModal({ event: null, defaultDate: day, defaultTime: time })
  }

  const handleEventClick = (ev) => {
    setModal({ event: ev, defaultDate: null })
  }

  const handleSave = (savedEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === savedEvent.id)
      if (idx >= 0) return prev.map(e => e.id === savedEvent.id ? savedEvent : e)
      return [...prev, savedEvent]
    })
    setModal(null)
  }

  const handleDelete = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    setModal(null)
  }

  const miniMonth = view === 'month' ? curDate.getMonth() : weekStart(curDate).getMonth()
  const miniYear = view === 'month' ? curDate.getFullYear() : weekStart(curDate).getFullYear()

  const handleMiniSelect = (day) => {
    if (view === 'month') {
      setCurDate(new Date(day.getFullYear(), day.getMonth(), 1))
    } else {
      setCurDate(weekStart(day))
    }
  }

  const handleMiniMonthChange = (dir) => {
    if (view === 'month') {
      setCurDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1))
    }
  }

  // Build modal default state including time for week view slots
  const getModalProps = () => {
    if (!modal) return null
    if (modal.event) return { event: modal.event, defaultDate: null }
    const base = {
      event: modal.defaultTime ? {
        tutto_il_giorno: false,
        data_inizio: toDateStr(modal.defaultDate),
        data_fine: toDateStr(modal.defaultDate),
        ora_inizio: modal.defaultTime,
        ora_fine: '',
      } : null,
      defaultDate: modal.defaultDate,
    }
    return base
  }

  return (
    <div className="-mx-4 md:-mx-6 -my-6 h-[calc(100vh-56px)] md:h-screen flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Today */}
        <button onClick={goToday}
          className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          Oggi
        </button>

        {/* Prev / Next */}
        <div className="flex">
          <button onClick={() => navigate(-1)} className="p-2 rounded-l-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-r-lg border border-l-0 border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Header label */}
        <h1 className="text-lg font-semibold text-gray-800 flex-1">{headerLabel()}</h1>

        {/* Filter */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[['all','Tutti'],['personal','Personali'],['shared','Condivisi']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                ${filter === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[['month','Mese'],['week','Settimana']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                ${view === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* New event */}
        <button onClick={() => setModal({ event: null, defaultDate: today })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Nuovo</span>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar: mini calendar */}
        <div className="hidden lg:flex flex-col gap-4 w-64 p-4 border-r border-gray-200 bg-white shrink-0">
          <MiniCalendar
            year={miniYear}
            month={miniMonth}
            selectedDate={curDate}
            today={today}
            events={filteredEvents}
            onDateSelect={handleMiniSelect}
            onMonthChange={handleMiniMonthChange}
          />

          {/* Upcoming events */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prossimi eventi</h3>
            {loading ? (
              <div className="text-xs text-gray-400">Caricamento...</div>
            ) : (
              <div className="space-y-1.5">
                {filteredEvents
                  .filter(ev => ev.data_inizio >= toDateStr(today))
                  .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
                  .slice(0, 5)
                  .map(ev => (
                    <button key={ev.id} type="button" onClick={() => handleEventClick(ev)}
                      className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: ev.colore || '#4285f4' }} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate">{ev.titolo}</div>
                        <div className="text-xs text-gray-400">
                          {parseDate(ev.data_inizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                          {ev.ora_inizio && ` · ${ev.ora_inizio}`}
                        </div>
                      </div>
                    </button>
                  ))
                }
                {filteredEvents.filter(ev => ev.data_inizio >= toDateStr(today)).length === 0 && (
                  <div className="text-xs text-gray-400">Nessun evento in arrivo</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main calendar area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
          {loading && (
            <div className="absolute top-16 right-4 z-30 text-xs text-gray-400 bg-white px-2 py-1 rounded shadow">
              Caricamento...
            </div>
          )}

          {view === 'month' ? (
            <MonthView
              year={curDate.getFullYear()}
              month={curDate.getMonth()}
              events={filteredEvents}
              today={today}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <WeekView
              weekStartDate={weekStart(curDate)}
              events={filteredEvents}
              today={today}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (() => {
        const mp = getModalProps()
        return (
          <EventModal
            event={mp.event}
            defaultDate={mp.defaultDate}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setModal(null)}
          />
        )
      })()}
    </div>
  )
}
