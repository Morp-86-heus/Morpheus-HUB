import { useState, useEffect } from 'react'
import axios from 'axios'

const STATI_CONTRATTO = [
  { value: 'attivo', label: 'Attivo', color: 'bg-green-100 text-green-700' },
  { value: 'sospeso', label: 'Sospeso', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'scaduto', label: 'Scaduto', color: 'bg-red-100 text-red-700' },
  { value: 'annullato', label: 'Annullato', color: 'bg-gray-100 text-gray-500' },
]
const FATTURAZIONE_LABEL = { una_tantum: 'Una tantum', mensile: 'Mensile', trimestrale: 'Trimestrale', semestrale: 'Semestrale', annuale: 'Annuale' }

function fmtPrezzo(centesimi) {
  if (centesimi == null) return '—'
  return `€ ${(centesimi / 100).toFixed(2)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT')
}

function ScadenzaBadge({ dataScadenza }) {
  if (!dataScadenza) return <span className="text-xs text-gray-400">Perpetuo</span>
  const oggi = new Date()
  const scad = new Date(dataScadenza)
  const diffDays = Math.ceil((scad - oggi) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Scaduto</span>
  if (diffDays <= 7) return <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{diffDays}gg</span>
  if (diffDays <= 30) return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">{diffDays}gg</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{fmtDate(dataScadenza)}</span>
}

const emptyForm = { cliente_id: '', servizio_id: '', data_inizio: new Date().toISOString().split('T')[0], data_scadenza: '', prezzo_override: '', stato: 'attivo', rinnovo_automatico: false, note: '' }

export default function AbbonamentiPage() {
  const [tab, setTab] = useState('abbonamenti')
  const [contratti, setContratti] = useState([])
  const [scadenze, setScadenze] = useState(null)
  const [clienti, setClienti] = useState([])
  const [servizi, setServizi] = useState([])
  const [filterStato, setFilterStato] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [scadenzeError, setScadenzeError] = useState(null)
  const [giorniSoglia, setGiorniSoglia] = useState(30)

  const loadContratti = () => {
    const params = {}
    if (filterStato) params.stato = filterStato
    if (filterCliente) params.cliente_id = filterCliente
    axios.get('/api/contratti-servizi', { params }).then(r => setContratti(r.data))
  }
  const loadScadenze = () => {
    setScadenzeError(null)
    axios.get('/api/contratti-servizi/scadenze', { params: { giorni: giorniSoglia } })
      .then(r => setScadenze(r.data))
      .catch(e => setScadenzeError(e.response?.data?.detail || 'Errore nel caricamento delle scadenze'))
  }

  useEffect(() => {
    axios.get('/api/clienti-diretti').then(r => setClienti(r.data))
    axios.get('/api/servizi', { params: { attivo: true } }).then(r => setServizi(r.data))
  }, [])

  useEffect(() => { loadContratti() }, [filterStato, filterCliente])
  useEffect(() => { if (tab === 'scadenze') loadScadenze() }, [tab, giorniSoglia])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        cliente_id: parseInt(form.cliente_id),
        servizio_id: parseInt(form.servizio_id),
        prezzo_override: form.prezzo_override !== '' ? Math.round(parseFloat(form.prezzo_override) * 100) : null,
        data_scadenza: form.data_scadenza || null,
      }
      if (editing) {
        await axios.put(`/api/contratti-servizi/${editing}`, payload)
      } else {
        await axios.post('/api/contratti-servizi', payload)
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      loadContratti()
      if (tab === 'scadenze') loadScadenze()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (c) => {
    setEditing(c.id)
    setForm({
      cliente_id: c.cliente_id,
      servizio_id: c.servizio_id,
      data_inizio: c.data_inizio,
      data_scadenza: c.data_scadenza || '',
      prezzo_override: c.prezzo_override != null ? (c.prezzo_override / 100).toFixed(2) : '',
      stato: c.stato,
      rinnovo_automatico: c.rinnovo_automatico,
      note: c.note || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo contratto?')) return
    await axios.delete(`/api/contratti-servizi/${id}`)
    loadContratti()
    if (tab === 'scadenze') loadScadenze()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"

  const ContrattoRow = ({ c }) => {
    const stato = STATI_CONTRATTO.find(s => s.value === c.stato)
    return (
      <tr className="hover:bg-blue-50/30 transition-colors">
        <td className="px-5 py-3 font-medium text-gray-900">{c.cliente_ragione_sociale}</td>
        <td className="px-5 py-3">
          <div className="text-gray-800">{c.servizio_nome}</div>
          <div className="text-xs text-gray-400">{FATTURAZIONE_LABEL[c.servizio_tipo_fatturazione] || ''}</div>
        </td>
        <td className="px-5 py-3 font-mono text-gray-700">{fmtPrezzo(c.prezzo_effettivo)}</td>
        <td className="px-5 py-3 text-gray-500">{fmtDate(c.data_inizio)}</td>
        <td className="px-5 py-3"><ScadenzaBadge dataScadenza={c.data_scadenza} /></td>
        <td className="px-5 py-3">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${stato?.color}`}>{stato?.label}</span>
        </td>
        <td className="px-5 py-3 text-right">
          <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3">Modifica</button>
          <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Elimina</button>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Abbonamenti</h1>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nuovo Contratto
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-100">
        {[{ k: 'abbonamenti', l: 'Lista Contratti' }, { k: 'scadenze', l: 'Scadenze' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-1 pb-2.5 mr-5 text-xs font-semibold border-b-2 transition-colors ${tab === t.k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* TAB: Lista Contratti */}
      {tab === 'abbonamenti' && (
        <>
          <div className="flex gap-3">
            <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={filterStato} onChange={e => setFilterStato(e.target.value)}>
              <option value="">Tutti gli stati</option>
              {STATI_CONTRATTO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={filterCliente} onChange={e => setFilterCliente(e.target.value)}>
              <option value="">Tutti i clienti</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Servizio</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prezzo</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Inizio</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Scadenza</th>
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stato</th>
                  <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratti.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">Nessun contratto trovato</td></tr>
                )}
                {contratti.map(c => <ContrattoRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB: Scadenze */}
      {tab === 'scadenze' && scadenzeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{scadenzeError}</div>
      )}
      {tab === 'scadenze' && !scadenzeError && scadenze && (
        <div className="space-y-6">
          {/* Controllo soglia giorni */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Mostra scadenze entro</span>
            <select className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={giorniSoglia} onChange={e => setGiorniSoglia(Number(e.target.value))}>
              {[7, 14, 30, 60, 90].map(g => <option key={g} value={g}>{g} giorni</option>)}
            </select>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Contratti Scaduti</p>
              <p className="text-3xl font-extrabold tracking-tight mt-2">{scadenze.scaduti.length}</p>
              <p className="text-xs text-gray-400 mt-1">Richiedono attenzione immediata</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">In Scadenza ({giorniSoglia}gg)</p>
              <p className="text-3xl font-extrabold tracking-tight mt-2">{scadenze.in_scadenza.length}</p>
              <p className="text-xs text-gray-400 mt-1">Da rinnovare a breve</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Abbonamenti Attivi</p>
              <p className="text-3xl font-extrabold tracking-tight mt-2">{contratti.filter(c => c.stato === 'attivo').length}</p>
              <p className="text-xs text-gray-400 mt-1">Totale contratti attivi</p>
            </div>
          </div>

          {/* Scaduti */}
          {scadenze.scaduti.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                Contratti Scaduti ({scadenze.scaduti.length})
              </h3>
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 border-b border-red-200">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-red-600 uppercase tracking-wide">Cliente</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-red-600 uppercase tracking-wide">Servizio</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-red-600 uppercase tracking-wide">Scaduto il</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-red-600 uppercase tracking-wide">Prezzo</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-red-600 uppercase tracking-wide">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {scadenze.scaduti.map(c => (
                      <tr key={c.id} className="hover:bg-red-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{c.cliente_ragione_sociale}</td>
                        <td className="px-5 py-3 text-gray-700">{c.servizio_nome}</td>
                        <td className="px-5 py-3 text-red-600 font-medium">{fmtDate(c.data_scadenza)}</td>
                        <td className="px-5 py-3 font-mono text-gray-700">{fmtPrezzo(c.prezzo_effettivo)}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Rinnova</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* In scadenza */}
          {scadenze.in_scadenza.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
                In Scadenza Entro {giorniSoglia} Giorni ({scadenze.in_scadenza.length})
              </h3>
              <div className="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-yellow-50 border-b border-yellow-200">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Cliente</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Servizio</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Scade il</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Giorni</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Prezzo</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100">
                    {scadenze.in_scadenza.map(c => {
                      const diffDays = Math.ceil((new Date(c.data_scadenza) - new Date()) / (1000 * 60 * 60 * 24))
                      return (
                        <tr key={c.id} className="hover:bg-yellow-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{c.cliente_ragione_sociale}</td>
                          <td className="px-5 py-3 text-gray-700">{c.servizio_nome}</td>
                          <td className="px-5 py-3 text-yellow-700 font-medium">{fmtDate(c.data_scadenza)}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold ${diffDays <= 7 ? 'text-orange-600' : 'text-yellow-600'}`}>{diffDays}gg</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-700">{fmtPrezzo(c.prezzo_effettivo)}</td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Rinnova</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {scadenze.scaduti.length === 0 && scadenze.in_scadenza.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-600">Nessuna scadenza imminente!</p>
              <p className="text-sm text-gray-400 mt-1">Tutti gli abbonamenti sono in regola.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nuovo/Modifica Contratto */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Modifica Contratto' : 'Nuovo Contratto'}</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 text-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Cliente *</label>
                <select className={inputCls} required value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
                  <option value="">Seleziona cliente...</option>
                  {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Servizio *</label>
                <select className={inputCls} required value={form.servizio_id} onChange={e => set('servizio_id', e.target.value)}>
                  <option value="">Seleziona servizio...</option>
                  {servizi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Data Inizio *</label>
                  <input className={inputCls} type="date" required value={form.data_inizio} onChange={e => set('data_inizio', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Data Scadenza</label>
                  <input className={inputCls} type="date" value={form.data_scadenza} onChange={e => set('data_scadenza', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Prezzo Override (€)</label>
                  <input className={inputCls} type="number" step="0.01" min="0" value={form.prezzo_override}
                    onChange={e => set('prezzo_override', e.target.value)} placeholder="Lascia vuoto per il catalogo" />
                </div>
                <div>
                  <label className={labelCls}>Stato</label>
                  <select className={inputCls} value={form.stato} onChange={e => set('stato', e.target.value)}>
                    {STATI_CONTRATTO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Rinnovo Automatico</label>
                <button type="button" onClick={() => set('rinnovo_automatico', !form.rinnovo_automatico)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.rinnovo_automatico ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.rinnovo_automatico ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <textarea className={inputCls} rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">Annulla</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
