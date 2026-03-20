import { useState, useEffect, useCallback } from 'react'
import { contabilitaApi } from '../api/client'
import FatturaDetail from '../components/FatturaDetail'
import FatturaModal from '../components/FatturaModal'

const fmtEuro = (cents) => {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT')
}

const STATO_BADGE = {
  bozza:    'bg-gray-100 text-gray-700',
  inviata:  'bg-blue-100 text-blue-700',
  pagata:   'bg-green-100 text-green-700',
  scaduta:  'bg-red-100 text-red-700',
  annullata:'bg-yellow-100 text-yellow-700',
}

const STATI = ['bozza', 'inviata', 'pagata', 'scaduta', 'annullata']

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200',
    green:  'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red:    'bg-red-50 border-red-200',
    purple: 'bg-purple-50 border-purple-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Mini bar chart ──────────────────────────────────────────────────────────
function TrendBar({ mesi }) {
  if (!mesi || mesi.length === 0) return null
  const max = Math.max(...mesi.map(m => m.fatturato), 1)
  return (
    <div className="flex items-end gap-1 h-20">
      {mesi.map((m, i) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-0">
          <div
            className="w-full bg-blue-400 rounded-t"
            style={{ height: `${(m.fatturato / max) * 64}px` }}
            title={`${m.mese_label}: ${fmtEuro(m.fatturato)}`}
          />
          <div className="text-xs text-gray-400 mt-1 truncate w-full text-center">
            {m.mese_label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard tab ───────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [perOrg, setPerOrg] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      contabilitaApi.stats(),
      contabilitaApi.statsPerOrg(),
      contabilitaApi.trend({ anno: new Date().getFullYear() }),
    ]).then(([s, o, t]) => {
      setStats(s.data)
      setPerOrg(o.data)
      setTrend(t.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Caricamento…</div>

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Fatturato (anno)" value={fmtEuro(stats?.fatturato_ytd)} color="blue" />
        <KpiCard label="Incassato (anno)" value={fmtEuro(stats?.incassato_ytd)} color="green" />
        <KpiCard label="Da incassare" value={fmtEuro(stats?.da_incassare)} color="yellow" />
        <KpiCard label="Scaduto" value={fmtEuro(stats?.scaduto)} color="red" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Bozze" value={stats?.num_bozza ?? 0} sub="fatture" color="blue" />
        <KpiCard label="Inviate" value={stats?.num_inviata ?? 0} sub="fatture" color="blue" />
        <KpiCard label="Pagate" value={stats?.num_pagata ?? 0} sub="fatture" color="green" />
        <KpiCard label="Scadute" value={stats?.num_scaduta ?? 0} sub="fatture" color="red" />
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Fatturato ultimi 12 mesi</h3>
        <TrendBar mesi={trend} />
      </div>

      {/* Per organizzazione */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Fatturato per organizzazione</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Organizzazione</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">Fatturato</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">Incassato</th>
              <th className="text-right px-5 py-3 font-medium text-gray-600">Pendente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {perOrg.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-4 text-center text-gray-400">Nessun dato</td>
              </tr>
            )}
            {perOrg.map((o, i) => {
              const pendente = o.fatturato - o.incassato
              return (
                <tr key={o.organizzazione_id ?? i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{o.organizzazione_nome}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{fmtEuro(o.fatturato)}</td>
                  <td className="px-5 py-3 text-right text-green-700">{fmtEuro(o.incassato)}</td>
                  <td className={`px-5 py-3 text-right font-medium ${pendente > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {fmtEuro(pendente)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Fatture tab ─────────────────────────────────────────────────────────────
function FattureTab() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 25
  const [filters, setFilters] = useState({ stato: '', search: '' })
  const [statoFilter, setStatoFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (statoFilter) params.stato = statoFilter
      if (filters.search) params.search = filters.search
      const r = await contabilitaApi.listFatture(params)
      setItems(r.data.items)
      setTotal(r.data.total)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statoFilter, filters.search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Cerca numero, organizzazione…"
            value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setStatoFilter(''); setPage(1) }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${!statoFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tutte
          </button>
          {STATI.map(s => (
            <button
              key={s}
              onClick={() => { setStatoFilter(s); setPage(1) }}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${statoFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuova fattura
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Caricamento…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Numero</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Organizzazione</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Emissione</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scadenza</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Importo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessuna fattura trovata</td>
                </tr>
              )}
              {items.map(f => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedId === f.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-blue-700">{f.numero}</td>
                  <td className="px-4 py-3 text-gray-700">{f.organizzazione_nome || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(f.data_emissione)}</td>
                  <td className={`px-4 py-3 ${f.stato === 'scaduta' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {fmtDate(f.data_scadenza)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtEuro(f.importo_totale)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium capitalize ${STATO_BADGE[f.stato] || 'bg-gray-100 text-gray-700'}`}>
                      {f.stato}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} fatture totali</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              ‹
            </button>
            <span className="px-3 py-1.5">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedId && (
        <FatturaDetail
          fatturaId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <FatturaModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ContabilitaPage() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Contabilità</h1>
        <p className="text-sm text-gray-500 mt-1">Gestione fatture e pagamenti della piattaforma</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'fatture',   label: 'Fatture' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'fatture' && <FattureTab />}
    </div>
  )
}
