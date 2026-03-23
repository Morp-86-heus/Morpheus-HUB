import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const euro = (cents) =>
  `€ ${((cents || 0) / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`

const STATO_COLORS = {
  preventivo: 'bg-gray-100 text-gray-600',
  confermata: 'bg-blue-100 text-blue-700',
  consegnata: 'bg-green-100 text-green-700',
  annullata:  'bg-red-100 text-red-500',
}

const STATO_OPTIONS = ['preventivo', 'confermata', 'consegnata', 'annullata']

function StatCard({ label, value, sub, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

function VenditaModal({ vendita, clienti, servizi, onClose, onSaved }) {
  const isEdit = !!vendita
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    cliente_id: vendita?.cliente_id ?? '',
    servizio_id: vendita?.servizio_id ?? '',
    prodotto_nome: vendita?.prodotto_nome ?? '',
    quantita: vendita?.quantita ?? 1,
    prezzo_unitario_euro: vendita ? (vendita.prezzo_unitario / 100).toFixed(2) : '',
    sconto_pct: vendita?.sconto_pct ?? 0,
    data_vendita: vendita?.data_vendita ?? today,
    stato: vendita?.stato ?? 'preventivo',
    note: vendita?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Quando si seleziona un servizio, pre-compila nome e prezzo
  const onServizioChange = (servizio_id) => {
    set('servizio_id', servizio_id)
    if (servizio_id) {
      const s = servizi.find(sv => String(sv.id) === String(servizio_id))
      if (s) {
        set('prodotto_nome', s.nome)
        if (s.prezzo) set('prezzo_unitario_euro', (s.prezzo / 100).toFixed(2))
      }
    }
  }

  const prezzoUnitarioCents = Math.round(parseFloat(String(form.prezzo_unitario_euro).replace(',', '.')) * 100) || 0
  const lordo = prezzoUnitarioCents * (form.quantita || 1)
  const sconto = Math.round(lordo * Math.max(0, Math.min(100, form.sconto_pct || 0)) / 100)
  const totale = lordo - sconto

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.prodotto_nome.trim()) { setError('Il nome prodotto è obbligatorio'); return }
    if (isNaN(prezzoUnitarioCents) || prezzoUnitarioCents < 0) { setError('Prezzo non valido'); return }

    setSaving(true); setError('')
    try {
      const payload = {
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        servizio_id: form.servizio_id ? parseInt(form.servizio_id) : null,
        prodotto_nome: form.prodotto_nome.trim(),
        quantita: parseInt(form.quantita) || 1,
        prezzo_unitario: prezzoUnitarioCents,
        sconto_pct: parseInt(form.sconto_pct) || 0,
        data_vendita: form.data_vendita,
        stato: form.stato,
        note: form.note || null,
      }
      if (isEdit) {
        await axios.put(`/api/vendite-prodotti/${vendita.id}`, payload)
      } else {
        await axios.post('/api/vendite-prodotti', payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      const det = err.response?.data?.detail
      setError(typeof det === 'string' ? det : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const lbl = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {isEdit ? 'Modifica vendita' : 'Nuova vendita prodotto'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Cliente */}
          <div>
            <label className={lbl}>Cliente</label>
            <select className={inp} value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">— Seleziona cliente —</option>
              {clienti.map(c => (
                <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
              ))}
            </select>
          </div>

          {/* Prodotto dal catalogo */}
          <div>
            <label className={lbl}>Prodotto dal catalogo (opzionale)</label>
            <select className={inp} value={form.servizio_id} onChange={e => onServizioChange(e.target.value)}>
              <option value="">— Seleziona o compila manualmente —</option>
              {servizi.map(s => (
                <option key={s.id} value={s.id}>{s.nome}{s.codice_sku ? ` (${s.codice_sku})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Nome prodotto */}
          <div>
            <label className={lbl}>Nome prodotto / descrizione *</label>
            <input className={inp} value={form.prodotto_nome}
              onChange={e => set('prodotto_nome', e.target.value)}
              placeholder="es. Notebook HP ProBook, Licenza Office 365, ..." />
          </div>

          {/* Qtà / Prezzo / Sconto */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Quantità</label>
              <input type="number" min="1" className={inp} value={form.quantita}
                onChange={e => set('quantita', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Prezzo unitario (€)</label>
              <input className={inp} value={form.prezzo_unitario_euro}
                onChange={e => set('prezzo_unitario_euro', e.target.value)}
                placeholder="0.00" />
            </div>
            <div>
              <label className={lbl}>Sconto (%)</label>
              <input type="number" min="0" max="100" className={inp} value={form.sconto_pct}
                onChange={e => set('sconto_pct', e.target.value)} />
            </div>
          </div>

          {/* Totale calcolato */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            <span className="text-gray-500">Totale</span>
            <span className="font-bold text-gray-900 text-base">{euro(totale)}</span>
          </div>

          {/* Data / Stato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Data vendita *</label>
              <input type="date" className={inp} value={form.data_vendita}
                onChange={e => set('data_vendita', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Stato</label>
              <select className={inp} value={form.stato} onChange={e => set('stato', e.target.value)}>
                {STATO_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {form.stato === 'consegnata' && (
            <div className="flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Questa vendita sarà registrata automaticamente nella contabilità.
            </div>
          )}

          {/* Note */}
          <div>
            <label className={lbl}>Note</label>
            <textarea rows={2} className={`${inp} resize-none`} value={form.note}
              onChange={e => set('note', e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea vendita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VenditeProdottiPage() {
  const { can } = useAuth()
  const canManage = can('commerciale') || can('amministratore') || can('proprietario')

  const annoCorrente = new Date().getFullYear()
  const [anno, setAnno] = useState(annoCorrente)
  const [anni, setAnni] = useState([annoCorrente])

  const [vendite, setVendite] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)

  const [filters, setFilters] = useState({ stato: '', search: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advFilters, setAdvFilters] = useState({ data_da: '', data_a: '', cliente_id: '' })

  const [clienti, setClienti] = useState([])
  const [servizi, setServizi] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editVendita, setEditVendita] = useState(null)

  const PAGE_SIZE = 30

  // Carica anni disponibili
  useEffect(() => {
    axios.get('/api/vendite-prodotti', { params: { page_size: 1 } })
      .then(() => {
        // Costruiamo anni da stat sul backend (semplificato: usiamo anno corrente ± 3)
        const cur = new Date().getFullYear()
        setAnni([cur, cur - 1, cur - 2].filter(a => a >= 2024))
      }).catch(() => {})
  }, [])

  useEffect(() => {
    axios.get('/api/clienti-diretti', { params: { page_size: 500 } })
      .then(r => setClienti(r.data.items || r.data))
      .catch(() => {})
    axios.get('/api/servizi', { params: { page_size: 500, categoria: 'prodotto' } })
      .then(r => setServizi(r.data.items || r.data))
      .catch(() => {})
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const r = await axios.get('/api/vendite-prodotti/stats', { params: { anno } })
      setStats(r.data)
    } catch { /* */ }
  }, [anno])

  const loadVendite = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        anno,
        page,
        page_size: PAGE_SIZE,
      }
      if (filters.stato) params.stato = filters.stato
      if (filters.search) params.search = filters.search
      if (advFilters.data_da) params.data_da = advFilters.data_da
      if (advFilters.data_a) params.data_a = advFilters.data_a
      if (advFilters.cliente_id) params.cliente_id = advFilters.cliente_id
      const r = await axios.get('/api/vendite-prodotti', { params })
      setVendite(r.data.items)
      setTotal(r.data.total)
    } catch { /* */ }
    setLoading(false)
  }, [anno, page, filters, advFilters])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadVendite() }, [loadVendite])

  useEffect(() => {
    setPage(1)
    setAdvFilters({ data_da: '', data_a: '', cliente_id: '' })
  }, [anno])

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const setAdv = (k, v) => { setAdvFilters(f => ({ ...f, [k]: v })); setPage(1) }

  const hasActiveFilters = filters.stato || filters.search ||
    advFilters.data_da || advFilters.data_a || advFilters.cliente_id

  const resetFilters = () => {
    setFilters({ stato: '', search: '' })
    setAdvFilters({ data_da: '', data_a: '', cliente_id: '' })
    setPage(1)
  }

  const elimina = async (v) => {
    if (!window.confirm(`Eliminare la vendita "${v.prodotto_nome}"?`)) return
    try {
      await axios.delete(`/api/vendite-prodotti/${v.id}`)
      loadVendite(); loadStats()
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore eliminazione')
    }
  }

  const onSaved = () => { loadVendite(); loadStats() }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendite Prodotti</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vendite una-tantum a clienti diretti — alimentano la contabilità al momento della consegna</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditVendita(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuova vendita
          </button>
        )}
      </div>

      {/* Selettore anno */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Anno:</span>
        {anni.map(a => (
          <button key={a} onClick={() => setAnno(a)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              a === anno
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {a === annoCorrente ? `${a} (corrente)` : a}
          </button>
        ))}
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Preventivi" value={stats.num_preventivo} color="gray" />
          <StatCard label="Confermate" value={stats.num_confermata}
            sub={euro(stats.totale_confermato)} color="blue" />
          <StatCard label="Consegnate" value={stats.num_consegnata}
            sub={euro(stats.totale_consegnato)} color="green" />
          <StatCard label="Annullate" value={stats.num_annullata} color="orange" />
        </div>
      )}

      {/* Filtri */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input type="text" placeholder="Cerca prodotto o cliente..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)} />
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.stato}
            onChange={e => setFilter('stato', e.target.value)}>
            <option value="">Tutti gli stati</option>
            {STATO_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
              showAdvanced || advFilters.data_da || advFilters.data_a || advFilters.cliente_id
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtri avanzati
          </button>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              ✕ Reset
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cliente</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={advFilters.cliente_id}
                onChange={e => setAdv('cliente_id', e.target.value)}>
                <option value="">Tutti i clienti</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data dal</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={advFilters.data_da}
                onChange={e => setAdv('data_da', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data al</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={advFilters.data_a}
                onChange={e => setAdv('data_a', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Caricamento...</div>
        ) : vendite.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-sm">Nessuna vendita trovata</p>
            {canManage && <p className="text-xs mt-1">Clicca "Nuova vendita" per aggiungerne una</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prodotto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtà</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prezzo unit.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Totale</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stato</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendite.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(v.data_vendita).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium max-w-[200px] truncate">
                    {v.prodotto_nome}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.cliente_nome || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{v.quantita}</td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {euro(v.prezzo_unitario)}
                    {v.sconto_pct > 0 && (
                      <span className="ml-1 text-xs text-orange-500">-{v.sconto_pct}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                    {euro(v.totale)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${STATO_COLORS[v.stato] || 'bg-gray-100 text-gray-600'}`}>
                      {v.stato}
                    </span>
                    {v.registrazione_contabile_id && (
                      <span className="ml-1 text-xs text-green-500" title="Registrata in contabilità">✓</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditVendita(v); setShowModal(true) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Modifica">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {v.stato !== 'consegnata' && (
                          <button
                            onClick={() => elimina(v)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Elimina">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          <span>{total} vendite totali</span>
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

      {showModal && (
        <VenditaModal
          vendita={editVendita}
          clienti={clienti}
          servizi={servizi}
          onClose={() => { setShowModal(false); setEditVendita(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
