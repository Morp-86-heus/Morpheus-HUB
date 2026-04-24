import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SLABadge from './SLABadge'

const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const STATO_COLORS = {
  'In gestione': 'bg-blue-100 text-blue-700',
  'Attesa parti': 'bg-orange-100 text-orange-700',
  'Sospesa': 'bg-yellow-100 text-yellow-700',
  'Chiusa': 'bg-gray-100 text-gray-500',
  'Annullata': 'bg-red-100 text-red-600',
}

function useDropdown() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openAt = (e, dropWidth = 208) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const left = rect.left + dropWidth > window.innerWidth ? rect.right - dropWidth : rect.left
      setPos({ top: rect.bottom + 4, left })
    }
    setOpen(o => !o)
  }

  return { open, setOpen, pos, btnRef, dropRef, openAt }
}

function FunnelIcon({ active }) {
  return (
    <svg className="w-3 h-3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>
  )
}

function ColumnFilter({ values, selected, onChange }) {
  const [search, setSearch] = useState('')
  const { open, setOpen, pos, btnRef, dropRef, openAt } = useDropdown()

  const toggle = (val) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
    onChange(next)
  }

  const filteredVals = values.filter(v => v.toLowerCase().includes(search.toLowerCase()))
  const isActive = selected.length > 0 && selected.length < values.length

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { openAt(e, 208); if (open) setSearch('') }}
        className={`inline-flex items-center justify-center w-4 h-4 rounded transition-colors shrink-0 ${
          isActive ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'
        }`}
        title={isActive ? `${selected.length} selezionat${selected.length === 1 ? 'o' : 'i'}` : 'Filtra'}
      >
        <FunnelIcon active={isActive} />
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-[9999] w-52 bg-white border border-gray-200 rounded-xl shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca..."
              autoFocus
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-3 px-3 py-1.5 border-b border-gray-100">
            <button onClick={() => onChange([...values])} className="text-xs text-blue-600 hover:underline">Tutti</button>
            <button onClick={() => onChange([])} className="text-xs text-gray-400 hover:underline">Nessuno</button>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredVals.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">Nessun risultato</div>
            ) : filteredVals.map(v => (
              <label key={v} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} className="accent-blue-500" />
                <span className="text-xs text-gray-700 truncate">{v}</span>
              </label>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function DateRangeFilter({ from, to, onChange }) {
  const { open, pos, btnRef, dropRef, openAt } = useDropdown()
  const isActive = !!(from || to)

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => openAt(e, 224)}
        className={`inline-flex items-center justify-center w-4 h-4 rounded transition-colors shrink-0 ${
          isActive ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'
        }`}
        title={isActive ? 'Filtro data attivo' : 'Filtra per data'}
      >
        <FunnelIcon active={isActive} />
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-[9999] w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-2"
          onClick={e => e.stopPropagation()}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Dal</label>
            <input
              type="date"
              value={from || ''}
              onChange={e => onChange(e.target.value || undefined, to)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Al</label>
            <input
              type="date"
              value={to || ''}
              onChange={e => onChange(from, e.target.value || undefined)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {isActive && (
            <button
              onClick={() => onChange(undefined, undefined)}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Cancella filtro
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

export default function TicketTable({
  tickets, onSelect, onSort, orderBy, orderDir, tecnicoColors = {},
  columnFilters = {}, onColumnFilter, lookupData = {},
  dateFilter = {}, onDateFilter,
}) {
  const makeFilter = (key) => {
    const values = lookupData[key] || []
    const selected = columnFilters[key] || []
    if (!onColumnFilter || values.length === 0) return null
    return <ColumnFilter values={values} selected={selected} onChange={(vals) => onColumnFilter(key, vals)} />
  }

  const th = (label, field, filterEl = null) => (
    <th
      key={field}
      className={`px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
        orderBy === field ? 'text-blue-600 bg-blue-50' : ''
      }`}
      onClick={() => onSort && onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {orderBy === field && <span className="text-xs">{orderDir === 'asc' ? '▲' : '▼'}</span>}
        {filterEl}
      </div>
    </th>
  )

  if (!tickets.length) {
    return <div className="text-center py-12 text-gray-400">Nessun ticket trovato</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {th('ID', 'id')}
            {th('Commitente', 'commitente', makeFilter('commitente'))}
            {th('Cliente', 'cliente', makeFilter('cliente'))}
            {th('NR INT', 'nr_intervento')}
            {th('Utente', 'utente')}
            {th('Città', 'citta', makeFilter('citta'))}
            {th('SLA', 'sla_scadenza')}
            {th('Stato', 'stato', makeFilter('stato'))}
            {th('Tecnico', 'tecnico', makeFilter('tecnico'))}
            {th('Data gest.', 'data_gestione',
              onDateFilter
                ? <DateRangeFilter from={dateFilter.data_da} to={dateFilter.data_a} onChange={onDateFilter} />
                : null
            )}
            {th('Progr.', 'nr_progressivo')}
            {th('Note', 'note')}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {tickets.map(t => (
            <tr
              key={t.id}
              onClick={() => onSelect && onSelect(t)}
              className="hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2 text-xs text-gray-400">
                {t.id}
                {t.numero_intervento > 1 && (
                  <span className="ml-1 inline-block px-1 py-0.5 rounded bg-orange-100 text-orange-600 text-xs font-semibold" title={`Seguito del ticket #${t.parent_ticket_id}`}>
                    ↩{t.numero_intervento}°
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-sm font-medium">{t.commitente || '—'}</td>
              <td className="px-3 py-2 text-sm">{t.cliente || '—'}</td>
              <td className="px-3 py-2 text-sm font-mono text-xs">{t.nr_intervento || '—'}</td>
              <td className="px-3 py-2 text-sm max-w-[150px] truncate" title={t.utente}>{t.utente || '—'}</td>
              <td className="px-3 py-2 text-sm max-w-[120px] truncate" title={t.citta}>{t.citta || '—'}</td>
              <td className="px-3 py-2"><SLABadge sla={t.sla_scadenza} stato={t.stato} /></td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATO_COLORS[t.stato] || 'bg-gray-100 text-gray-600'}`}>
                  {t.stato || '—'}
                </span>
              </td>
              <td className="px-3 py-2 text-sm">
                {t.tecnico ? (
                  tecnicoColors[t.tecnico] ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: tecnicoColors[t.tecnico] + '22',
                        color: tecnicoColors[t.tecnico],
                        border: `1px solid ${tecnicoColors[t.tecnico]}44`,
                      }}
                    >
                      {t.tecnico}
                    </span>
                  ) : t.tecnico
                ) : t.tecnico_esterno ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <span className="opacity-60 font-normal">est.</span>
                    {t.tecnico_esterno}
                  </span>
                ) : '—'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-500">
                {t.data_gestione ? new Date(t.data_gestione).toLocaleDateString('it-IT') : '—'}
              </td>
              <td className="px-3 py-2 text-center text-sm text-gray-500">{t.nr_progressivo ?? '—'}</td>
              <td className="px-3 py-2 text-sm text-gray-500 max-w-[200px] truncate" title={stripHtml(t.note)}>
                {stripHtml(t.note) || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
