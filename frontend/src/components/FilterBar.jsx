import { useState, useEffect } from 'react'
import { lookupApi } from '../api/client'

const TUTTI_STATI = ['In gestione', 'Attesa parti', 'Sospesa', 'Chiusa', 'Annullata']

const STATO_ON = {
  'In gestione': 'bg-blue-500 text-white border-blue-500',
  'Attesa parti': 'bg-orange-500 text-white border-orange-500',
  'Sospesa': 'bg-yellow-400 text-white border-yellow-400',
  'Chiusa': 'bg-gray-400 text-white border-gray-400',
  'Annullata': 'bg-red-500 text-white border-red-500',
}

const STATO_OFF = 'bg-white text-gray-300 border-gray-200 line-through'

export default function FilterBar({ filters, onChange, stati = TUTTI_STATI }) {
  const [commitenti, setCommitenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [tecnici, setTecnici] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    lookupApi.commitenti().then(r => setCommitenti(r.data))
    lookupApi.tecnici().then(r => setTecnici(r.data))
  }, [])

  useEffect(() => {
    if (filters.commitente) {
      lookupApi.clienti(filters.commitente).then(r => setClienti(r.data))
    } else {
      lookupApi.clienti().then(r => setClienti(r.data))
    }
  }, [filters.commitente])

  const toggleStato = (s) => {
    const current = filters.stato || stati
    const isOn = current.includes(s)
    const next = isOn ? current.filter(x => x !== s) : [...current, s]
    onChange({ ...filters, stato: next, page: 1 })
  }

  const set = (key, val) => onChange({ ...filters, [key]: val || undefined, page: 1 })

  const selectCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Stato toggle pills */}
      <div className="flex flex-wrap gap-2 items-center">
        {stati.map(s => {
          const on = (filters.stato || stati).includes(s)
          return (
            <button
              key={s}
              onClick={() => toggleStato(s)}
              title={on ? `Nascondi "${s}"` : `Mostra "${s}"`}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${on ? STATO_ON[s] : STATO_OFF}`}
            >
              {s}
            </button>
          )
        })}
        <button
          onClick={() => onChange({ ...filters, stato: [...stati], page: 1 })}
          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          title="Accendi tutti"
        >
          Tutti
        </button>
      </div>

      {/* Search + toggle advanced */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cerca per NR INT, utente, città, note..."
            value={filters.search || ''}
            onChange={e => set('search', e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${
            showAdvanced ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filtri
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
          <select value={filters.commitente || ''} onChange={e => set('commitente', e.target.value)} className={selectCls}>
            <option value="">Tutti i commitenti</option>
            {commitenti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>

          <select value={filters.cliente || ''} onChange={e => set('cliente', e.target.value)} className={selectCls}>
            <option value="">Tutti i clienti</option>
            {clienti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>

          <select value={filters.tecnico || ''} onChange={e => set('tecnico', e.target.value)} className={selectCls}>
            <option value="">Tutti i tecnici</option>
            {tecnici.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
          </select>

          <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={filters.sla_scaduta || false}
              onChange={e => onChange({ ...filters, sla_scaduta: e.target.checked || undefined, page: 1 })}
              className="accent-blue-500"
            />
            <span className="text-xs font-medium text-gray-600">SLA scaduta</span>
          </label>

          <input type="date" value={filters.data_da || ''} onChange={e => set('data_da', e.target.value)}
            className={selectCls} placeholder="Data da" />
          <input type="date" value={filters.data_a || ''} onChange={e => set('data_a', e.target.value)}
            className={selectCls} placeholder="Data a" />

          <button
            onClick={() => onChange({ page: 1, stato: [...stati] })}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Reset filtri
          </button>
        </div>
      )}
    </div>
  )
}
