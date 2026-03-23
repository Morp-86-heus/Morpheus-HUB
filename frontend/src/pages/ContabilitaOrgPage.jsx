import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const euro = (cents) => `€ ${(cents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`

const STATO_COLORS = {
  emessa:    'bg-blue-100 text-blue-700',
  incassata: 'bg-green-100 text-green-700',
  annullata: 'bg-gray-100 text-gray-500',
}

const TIPO_COLORS = {
  ticket:   'bg-orange-100 text-orange-700',
  servizio: 'bg-purple-100 text-purple-700',
  manuale:  'bg-gray-100 text-gray-600',
}

const TIPO_LABELS = {
  ticket:   'Ticket',
  servizio: 'Servizio',
  manuale:  'Manuale',
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-600',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

function TrendChart({ data }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => Math.max(d.emesso, d.incassato)), 1)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Trend mensile</h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => (
          <div key={d.mese} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end" style={{ height: '90px' }}>
              <div
                className="flex-1 bg-blue-400 rounded-t min-h-[2px] transition-all"
                style={{ height: `${(d.emesso / maxVal) * 90}px` }}
                title={`Emesso: ${euro(d.emesso)}`}
              />
              <div
                className="flex-1 bg-green-400 rounded-t min-h-[2px] transition-all"
                style={{ height: `${(d.incassato / maxVal) * 90}px` }}
                title={`Incassato: ${euro(d.incassato)}`}
              />
            </div>
            <span className="text-[9px] text-gray-400">{d.mese_label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Emesso</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Incassato</span>
      </div>
    </div>
  )
}

function NuovaRegistrazioneModal({ onClose, onSaved, defaultAnno }) {
  const [form, setForm] = useState({
    descrizione: '',
    importo: '',
    data_competenza: `${defaultAnno}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    cliente_nome: '',
    stato: 'emessa',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descrizione || !form.importo || !form.data_competenza) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    const importoCents = Math.round(parseFloat(form.importo.replace(',', '.')) * 100)
    if (isNaN(importoCents) || importoCents <= 0) {
      setError('Importo non valido')
      return
    }
    setSaving(true)
    setError('')
    try {
      await axios.post('/api/contabilita-org/registrazioni', { ...form, importo: importoCents })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Nuova registrazione manuale</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.descrizione}
              onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="es. Consulenza, ricambio, ecc."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Importo (€) *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.importo}
                onChange={e => setForm(f => ({ ...f, importo: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.data_competenza}
                onChange={e => setForm(f => ({ ...f, data_competenza: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.cliente_nome}
              onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
              placeholder="Nome cliente"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stato</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.stato}
              onChange={e => setForm(f => ({ ...f, stato: e.target.value }))}
            >
              <option value="emessa">Emessa</option>
              <option value="incassata">Incassata</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContabilitaOrgPage() {
  const { can, hasFeature } = useAuth()
  const canManage = can('contabilita.manage')
  const annoCorrente = new Date().getFullYear()

  const [anni, setAnni] = useState([annoCorrente])
  const [annoSelezionato, setAnnoSelezionato] = useState(annoCorrente)

  const [tab, setTab] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [trend, setTrend] = useState([])
  const [ticketRicavi, setTicketRicavi] = useState([])

  const [registrazioni, setRegistrazioni] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ stato: '', tipo: '', search: '', data_da: '', data_a: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const PAGE_SIZE = 30

  // Carica anni disponibili
  useEffect(() => {
    axios.get('/api/contabilita-org/anni')
      .then(r => setAnni(r.data))
      .catch(() => {})
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      const [d, t, tr] = await Promise.all([
        axios.get('/api/contabilita-org/dashboard', { params: { anno: annoSelezionato } }),
        axios.get('/api/contabilita-org/trend-mensile', { params: { anno: annoSelezionato } }),
        axios.get('/api/contabilita-org/registrazioni', {
          params: {
            tipo: 'ticket',
            stato: ['emessa', 'incassata'],
            data_da: `${annoSelezionato}-01-01`,
            data_a: `${annoSelezionato}-12-31`,
            page_size: 200,
          },
        }),
      ])
      setDashboard(d.data)
      setTrend(t.data)
      setTicketRicavi(tr.data.items)
    } catch { /* feature non disponibile o errore rete */ }
  }, [annoSelezionato])

  const loadRegistrazioni = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        data_da: filters.data_da || `${annoSelezionato}-01-01`,
        data_a:  filters.data_a  || `${annoSelezionato}-12-31`,
      }
      if (filters.stato)  params.stato  = filters.stato
      if (filters.tipo)   params.tipo   = filters.tipo
      if (filters.search) params.search = filters.search
      const res = await axios.get('/api/contabilita-org/registrazioni', { params })
      setRegistrazioni(res.data.items)
      setTotal(res.data.total)
    } catch { /* gestione silenziosa */ }
    setLoading(false)
  }, [page, filters, annoSelezionato])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { if (tab === 'registrazioni') loadRegistrazioni() }, [tab, loadRegistrazioni])

  // Reset pagina e filtri data quando cambia anno
  useEffect(() => {
    setPage(1)
    setFilters(f => ({ ...f, data_da: '', data_a: '' }))
  }, [annoSelezionato])

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters({ stato: '', tipo: '', search: '', data_da: '', data_a: '' })
    setPage(1)
  }

  const hasActiveFilters = filters.stato || filters.tipo || filters.search || filters.data_da || filters.data_a

  const sync = async (tipo) => {
    setSyncing(tipo)
    setSyncMsg('')
    try {
      const res = await axios.post(`/api/contabilita-org/sync/${tipo}`)
      const { importate, skippate, annullate } = res.data
      let msg = `Sync ${tipo === 'tickets' ? 'ticket' : 'contratti'}: ${importate} importate, ${skippate} invariate`
      if (annullate > 0) msg += `, ${annullate} annullate`
      setSyncMsg(msg)
      loadDashboard()
      if (tab === 'registrazioni') loadRegistrazioni()
    } catch (err) {
      setSyncMsg(err.response?.data?.detail || 'Errore sync')
    } finally {
      setSyncing('')
    }
  }

  const cambiaStato = async (reg, nuovoStato) => {
    try {
      await axios.put(`/api/contabilita-org/registrazioni/${reg.id}`, { stato: nuovoStato })
      loadRegistrazioni()
      loadDashboard()
    } catch { /* errore */ }
  }

  const eliminaReg = async (reg) => {
    if (!window.confirm('Eliminare questa registrazione?')) return
    try {
      await axios.delete(`/api/contabilita-org/registrazioni/${reg.id}`)
      loadRegistrazioni()
      loadDashboard()
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore eliminazione')
    }
  }

  if (!hasFeature('contabilita')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Funzionalità Enterprise</h2>
        <p className="text-gray-500 max-w-sm">Il modulo Contabilità è disponibile nel piano Enterprise.</p>
      </div>
    )
  }

  const isArchivio = annoSelezionato !== annoCorrente

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contabilità</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registrazioni alimentate da ticket chiusi e vendite servizi</p>
        </div>
        {canManage && !isArchivio && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sync('tickets')}
              disabled={!!syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100 disabled:opacity-50 transition-colors"
            >
              {syncing === 'tickets'
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              }
              Sync Ticket
            </button>
            <button
              onClick={() => sync('contratti')}
              disabled={!!syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {syncing === 'contratti'
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              }
              Sync Contratti
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuova voce
            </button>
          </div>
        )}
      </div>

      {/* Selettore anno — archivio */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Anno:</span>
        {anni.map(a => (
          <button
            key={a}
            onClick={() => setAnnoSelezionato(a)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              a === annoSelezionato
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {a === annoCorrente ? `${a} (corrente)` : a}
          </button>
        ))}
      </div>

      {/* Banner archivio */}
      {isArchivio && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
          </svg>
          <span><strong>Archivio {annoSelezionato}</strong> — visualizzazione in sola lettura dell'esercizio chiuso.</span>
        </div>
      )}

      {syncMsg && (
        <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {syncMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'registrazioni', label: 'Registrazioni' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Dashboard */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {dashboard ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Totale emesso" value={euro(dashboard.totale_emesso)} color="blue" />
                <StatCard label="Incassato" value={euro(dashboard.totale_incassato)} color="green" />
                <StatCard label="Da incassare" value={euro(dashboard.da_incassare)} color="orange" />
                <StatCard
                  label="Distribuzione"
                  value={`${dashboard.num_emessa + dashboard.num_incassata}`}
                  sub={`${dashboard.num_emessa} emessa · ${dashboard.num_incassata} incassata`}
                  color="gray"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <TrendChart data={trend} />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Origine registrazioni</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Da ticket chiusi',     value: dashboard.num_ticket,   color: 'bg-orange-500' },
                      { label: 'Da contratti servizi', value: dashboard.num_servizio,  color: 'bg-purple-500' },
                      { label: 'Inserimento manuale',  value: dashboard.num_manuale,  color: 'bg-gray-400'   },
                    ].map(item => {
                      const tot = dashboard.num_ticket + dashboard.num_servizio + dashboard.num_manuale
                      const pct = tot > 0 ? Math.round((item.value / tot) * 100) : 0
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Tabella ticket con ricavi */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Ticket con ricavi</h3>
                  <span className="text-xs text-gray-400">{ticketRicavi.length} ticket</span>
                </div>
                {ticketRicavi.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
                    {isArchivio ? 'Nessun ticket con ricavi in questo anno' : 'Nessun ricavo da ticket — usa "Sync Ticket" per importare'}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intervento</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Importo</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ticketRicavi.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{r.descrizione}</td>
                          <td className="px-4 py-2.5 text-gray-500">{r.cliente_nome || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                            {new Date(r.data_competenza).toLocaleDateString('it-IT')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800 whitespace-nowrap">
                            {euro(r.importo)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${STATO_COLORS[r.stato] || 'bg-gray-100 text-gray-500'}`}>
                              {r.stato}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Totale</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                          {euro(ticketRicavi.reduce((s, r) => s + r.importo, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Caricamento...</div>
          )}
        </div>
      )}

      {/* Tab: Registrazioni */}
      {tab === 'registrazioni' && (
        <div className="space-y-4">
          {/* Filtri */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            {/* Riga principale */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Cerca descrizione o cliente..."
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
              />
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.stato}
                onChange={e => setFilter('stato', e.target.value)}
              >
                <option value="">Tutti gli stati</option>
                <option value="emessa">Emessa</option>
                <option value="incassata">Incassata</option>
                <option value="annullata">Annullata</option>
              </select>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.tipo}
                onChange={e => setFilter('tipo', e.target.value)}
              >
                <option value="">Tutti i tipi</option>
                <option value="ticket">Ticket</option>
                <option value="servizio">Servizio</option>
                <option value="manuale">Manuale</option>
              </select>
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  showAdvanced || filters.data_da || filters.data_a
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filtri avanzati
              </button>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  ✕ Reset
                </button>
              )}
            </div>

            {/* Filtri avanzati espandibili */}
            {showAdvanced && (
              <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data dal</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.data_da}
                    min={`${annoSelezionato}-01-01`}
                    max={`${annoSelezionato}-12-31`}
                    onChange={e => setFilter('data_da', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data al</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.data_a}
                    min={`${annoSelezionato}-01-01`}
                    max={`${annoSelezionato}-12-31`}
                    onChange={e => setFilter('data_a', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabella */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Caricamento...</div>
            ) : registrazioni.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Nessuna registrazione trovata</p>
                {canManage && !isArchivio && (
                  <p className="text-xs mt-1">Usa i pulsanti "Sync" per importare dai ticket e contratti</p>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrizione</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Importo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stato</th>
                    {canManage && !isArchivio && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {registrazioni.map(reg => (
                    <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(reg.data_competenza).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${TIPO_COLORS[reg.tipo] || 'bg-gray-100 text-gray-600'}`}>
                          {TIPO_LABELS[reg.tipo] || reg.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{reg.descrizione}</td>
                      <td className="px-4 py-3 text-gray-500">{reg.cliente_nome || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {euro(reg.importo)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${STATO_COLORS[reg.stato] || 'bg-gray-100 text-gray-500'}`}>
                          {reg.stato}
                        </span>
                      </td>
                      {canManage && !isArchivio && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {reg.stato === 'emessa' && (
                              <button onClick={() => cambiaStato(reg, 'incassata')}
                                className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                                Incassa
                              </button>
                            )}
                            {reg.stato === 'incassata' && (
                              <button onClick={() => cambiaStato(reg, 'emessa')}
                                className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors">
                                Ripristina
                              </button>
                            )}
                            {reg.stato !== 'annullata' && (
                              <button onClick={() => cambiaStato(reg, 'annullata')}
                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">
                                Annulla
                              </button>
                            )}
                            {reg.tipo === 'manuale' && reg.stato !== 'incassata' && (
                              <button onClick={() => eliminaReg(reg)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Elimina">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginazione */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{total} registrazioni totali</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  ← Prec
                </button>
                <span className="px-3 py-1.5">Pag. {page} / {Math.ceil(total / PAGE_SIZE)}</span>
                <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Succ →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <NuovaRegistrazioneModal
          onClose={() => setShowModal(false)}
          onSaved={() => { loadDashboard(); if (tab === 'registrazioni') loadRegistrazioni() }}
          defaultAnno={annoSelezionato}
        />
      )}
    </div>
  )
}
