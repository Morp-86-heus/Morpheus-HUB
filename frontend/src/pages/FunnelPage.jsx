import { useState, useEffect } from 'react'
import axios from 'axios'

const FASI = [
  { key: 'lead',         label: 'Lead',         bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',   hbg: 'bg-gray-50',    dot: 'bg-gray-400'   },
  { key: 'qualifica',    label: 'Qualifica',    bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   hbg: 'bg-blue-50',    dot: 'bg-blue-500'   },
  { key: 'proposta',     label: 'Proposta',     bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hbg: 'bg-purple-50',  dot: 'bg-purple-500' },
  { key: 'negoziazione', label: 'Negoziazione', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hbg: 'bg-orange-50',  dot: 'bg-orange-500' },
  { key: 'vinto',        label: '✓ Vinto',      bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  hbg: 'bg-green-50',   dot: 'bg-green-500'  },
  { key: 'perso',        label: '✗ Perso',      bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    hbg: 'bg-red-50',     dot: 'bg-red-500'    },
]

function fmtEuro(centesimi) {
  if (!centesimi) return '—'
  return `€ ${(centesimi / 100).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

const emptyForm = {
  titolo: '', cliente_id: '', cliente_nome_libero: '',
  valore: '', fase: 'lead', probabilita: '', data_chiusura_prevista: '',
  assegnato_a: '', note: '', motivo_perdita: '',
}

export default function FunnelPage() {
  const [opportunita, setOpportunita] = useState([])
  const [stats, setStats] = useState(null)
  const [clienti, setClienti] = useState([])
  const [utenti, setUtenti] = useState([])
  const [view, setView] = useState('kanban')   // 'kanban' | 'lista'
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = () => Promise.all([
    axios.get('/api/opportunita'),
    axios.get('/api/opportunita/stats'),
  ]).then(([op, st]) => { setOpportunita(op.data); setStats(st.data) })

  useEffect(() => {
    load()
    axios.get('/api/clienti-diretti').then(r => setClienti(r.data))
    axios.get('/api/auth/users').then(r => setUtenti(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (o) => {
    setEditing(o.id)
    setForm({
      titolo: o.titolo,
      cliente_id: o.cliente_id ?? '',
      cliente_nome_libero: o.cliente_nome_libero ?? '',
      valore: o.valore != null ? (o.valore / 100).toFixed(2) : '',
      fase: o.fase,
      probabilita: o.probabilita ?? '',
      data_chiusura_prevista: o.data_chiusura_prevista ?? '',
      assegnato_a: o.assegnato_a ?? '',
      note: o.note ?? '',
      motivo_perdita: o.motivo_perdita ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload = {
        titolo: form.titolo,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        cliente_nome_libero: form.cliente_id ? null : (form.cliente_nome_libero || null),
        valore: form.valore !== '' ? Math.round(parseFloat(form.valore) * 100) : null,
        fase: form.fase,
        probabilita: form.probabilita !== '' ? parseInt(form.probabilita) : null,
        data_chiusura_prevista: form.data_chiusura_prevista || null,
        assegnato_a: form.assegnato_a ? parseInt(form.assegnato_a) : null,
        note: form.note || null,
        motivo_perdita: form.motivo_perdita || null,
      }
      if (editing) await axios.put(`/api/opportunita/${editing}`, payload)
      else await axios.post('/api/opportunita', payload)
      setShowForm(false); setEditing(null); setForm(emptyForm)
      load()
    } catch (err) { setError(err.response?.data?.detail || 'Errore') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa opportunità?')) return
    await axios.delete(`/api/opportunita/${id}`)
    load()
  }

  const moveFase = async (o, dir) => {
    const idx = FASI.findIndex(f => f.key === o.fase)
    const next = FASI[idx + dir]
    if (!next) return
    await axios.put(`/api/opportunita/${o.id}`, { fase: next.key })
    load()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"

  // Calcoli KPI
  const fassiAttive = ['lead', 'qualifica', 'proposta', 'negoziazione']
  const pipelineValore = opportunita.filter(o => fassiAttive.includes(o.fase)).reduce((s, o) => s + (o.valore || 0), 0)
  const vintoValore = opportunita.filter(o => o.fase === 'vinto').reduce((s, o) => s + (o.valore || 0), 0)
  const concluse = opportunita.filter(o => o.fase === 'vinto' || o.fase === 'perso').length
  const tasso = concluse > 0 ? Math.round((opportunita.filter(o => o.fase === 'vinto').length / concluse) * 100) : 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Funnel di Vendita</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestisci il pipeline commerciale</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle vista — border-bottom tabs */}
          <div className="flex border-b border-gray-100">
            {[{ k: 'kanban', l: 'Kanban' }, { k: 'lista', l: 'Lista' }].map(t => (
              <button key={t.k} onClick={() => setView(t.k)}
                className={`px-1 pb-2.5 mr-5 text-xs font-semibold border-b-2 transition-colors ${view === t.k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.l}
              </button>
            ))}
          </div>
          <button onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            + Nuova Opportunità
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Pipeline Attivo</p>
          <p className="text-3xl font-extrabold tracking-tight mt-2 text-blue-600">{fmtEuro(pipelineValore)}</p>
          <p className="text-xs text-gray-400 mt-1">{opportunita.filter(o => fassiAttive.includes(o.fase)).length} opportunità</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Vinte</p>
          <p className="text-3xl font-extrabold tracking-tight mt-2 text-green-600">{fmtEuro(vintoValore)}</p>
          <p className="text-xs text-gray-400 mt-1">{opportunita.filter(o => o.fase === 'vinto').length} opportunità</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Tasso di Chiusura</p>
          <p className="text-3xl font-extrabold tracking-tight mt-2 text-violet-600">{tasso}%</p>
          <p className="text-xs text-gray-400 mt-1">su {concluse} opportunità concluse</p>
        </div>
      </div>

      {/* VISTA KANBAN */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {FASI.map((fase, fi) => {
            const cards = opportunita.filter(o => o.fase === fase.key)
            const totaleValore = cards.reduce((s, o) => s + (o.valore || 0), 0)
            return (
              <div key={fase.key} className="flex-shrink-0 w-64">
                {/* Colonna header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-2xl border-x border-t ${fase.border} ${fase.hbg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${fase.dot}`} />
                    <span className={`text-xs font-semibold ${fase.text}`}>{fase.label}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${fase.bg} ${fase.text}`}>{cards.length}</span>
                  </div>
                  {totaleValore > 0 && (
                    <span className="text-xs text-gray-500 font-mono">{fmtEuro(totaleValore)}</span>
                  )}
                </div>
                {/* Cards */}
                <div className={`rounded-b-2xl border-x border-b ${fase.border} min-h-32 p-2 space-y-2 bg-gray-50/50`}>
                  {cards.map(o => (
                    <div key={o.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                      onClick={() => openEdit(o)}>
                      <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{o.titolo}</p>
                      {o.cliente_nome && <p className="text-xs text-gray-500 truncate">{o.cliente_nome}</p>}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className="text-xs font-mono font-semibold text-blue-600">{fmtEuro(o.valore)}</span>
                        {o.probabilita != null && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            o.probabilita >= 70 ? 'bg-green-100 text-green-700' :
                            o.probabilita >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{o.probabilita}%</span>
                        )}
                      </div>
                      {o.data_chiusura_prevista && (
                        <p className="text-xs text-gray-400 mt-1.5">📅 {fmtDate(o.data_chiusura_prevista)}</p>
                      )}
                      {/* Frecce sposta fase */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <button onClick={e => { e.stopPropagation(); moveFase(o, -1) }}
                          disabled={fi === 0}
                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1.5 py-1 rounded hover:bg-gray-100 transition-colors">◀</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(o.id) }}
                          className="text-gray-300 hover:text-red-400 text-xs px-1.5 py-1 rounded hover:bg-red-50 transition-colors">✕</button>
                        <button onClick={e => { e.stopPropagation(); moveFase(o, +1) }}
                          disabled={fi === FASI.length - 1}
                          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs px-1.5 py-1 rounded hover:bg-gray-100 transition-colors">▶</button>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-4">Nessuna opportunità</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VISTA LISTA */}
      {view === 'lista' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 border-b border-gray-100">
              <tr>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Opportunità</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fase</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Valore</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prob.</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Chiusura</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {opportunita.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">Nessuna opportunità</td></tr>
              )}
              {opportunita.map(o => {
                const fase = FASI.find(f => f.key === o.fase)
                return (
                  <tr key={o.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{o.titolo}</td>
                    <td className="px-5 py-3 text-gray-500">{o.cliente_nome || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${fase?.bg} ${fase?.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${fase?.dot}`} />
                        {fase?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-700">{fmtEuro(o.valore)}</td>
                    <td className="px-5 py-3">
                      {o.probabilita != null
                        ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${o.probabilita >= 70 ? 'bg-green-100 text-green-700' : o.probabilita >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{o.probabilita}%</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{o.data_chiusura_prevista ? fmtDate(o.data_chiusura_prevista) : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(o)} className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3">Modifica</button>
                      <button onClick={() => handleDelete(o.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Modifica Opportunità' : 'Nuova Opportunità'}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 text-lg transition-colors">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Titolo *</label>
                <input className={inputCls} required value={form.titolo} onChange={e => set('titolo', e.target.value)} placeholder="Es. Rinnovo contratto assistenza" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fase</label>
                  <select className={inputCls} value={form.fase} onChange={e => set('fase', e.target.value)}>
                    {FASI.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Valore (€)</label>
                  <input className={inputCls} type="number" step="0.01" min="0" value={form.valore} onChange={e => set('valore', e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Cliente</label>
                <select className={inputCls} value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
                  <option value="">— Seleziona cliente diretto —</option>
                  {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
                </select>
              </div>
              {!form.cliente_id && (
                <div>
                  <label className={labelCls}>Nome cliente (testo libero)</label>
                  <input className={inputCls} value={form.cliente_nome_libero} onChange={e => set('cliente_nome_libero', e.target.value)} placeholder="Es. Azienda XYZ" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Probabilità (%)</label>
                  <input className={inputCls} type="number" min="0" max="100" value={form.probabilita} onChange={e => set('probabilita', e.target.value)} placeholder="0–100" />
                </div>
                <div>
                  <label className={labelCls}>Chiusura prevista</label>
                  <input className={inputCls} type="date" value={form.data_chiusura_prevista} onChange={e => set('data_chiusura_prevista', e.target.value)} />
                </div>
              </div>

              {utenti.length > 0 && (
                <div>
                  <label className={labelCls}>Assegnato a</label>
                  <select className={inputCls} value={form.assegnato_a} onChange={e => set('assegnato_a', e.target.value)}>
                    <option value="">— Nessuno —</option>
                    {utenti.map(u => <option key={u.id} value={u.id}>{u.nome_completo || u.email}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Note</label>
                <textarea className={inputCls} rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
              </div>

              {form.fase === 'perso' && (
                <div>
                  <label className={labelCls}>Motivo perdita</label>
                  <textarea className={inputCls} rows={2} value={form.motivo_perdita} onChange={e => set('motivo_perdita', e.target.value)} placeholder="Perché è stata persa l'opportunità?" />
                </div>
              )}

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
