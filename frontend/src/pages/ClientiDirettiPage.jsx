import { useState, useEffect, useCallback } from 'react'
import { clientiDirettiApi } from '../api/client'
import axios from 'axios'

// ── Costanti ──────────────────────────────────────────────────────────────────

const emptyForm = {
  ragione_sociale: '', partita_iva: '', codice_fiscale: '',
  via: '', civico: '', cap: '', citta: '', provincia: '', regione: '',
  telefono: '', email: '', pec: '', sito_web: '',
  referente_nome: '', referente_ruolo: '', referente_telefono: '', referente_email: '',
  note: ''
}

const emptySede = {
  nome: '', via: '', civico: '', cap: '', citta: '', provincia: '',
  telefono: '', referente_nome: '', referente_telefono: '', referente_email: '', note: ''
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"
const sectionCls = "text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-3"

// ── Form sede inline ──────────────────────────────────────────────────────────

function SedeForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial || emptySede)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Nome sede / etichetta</label>
          <input className={inputCls} placeholder="es. Sede Roma, Magazzino, Filiale Nord"
            value={f.nome} onChange={e => set('nome', e.target.value)} />
        </div>
        <div className="col-span-2 grid grid-cols-4 gap-3">
          <div className="col-span-3">
            <label className={labelCls}>Via</label>
            <input className={inputCls} value={f.via} onChange={e => set('via', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Civico</label>
            <input className={inputCls} value={f.civico} onChange={e => set('civico', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>CAP</label>
          <input className={inputCls} value={f.cap} onChange={e => set('cap', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Città</label>
          <input className={inputCls} value={f.citta} onChange={e => set('citta', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Provincia</label>
          <input className={inputCls} value={f.provincia} onChange={e => set('provincia', e.target.value)} maxLength={5} />
        </div>
        <div>
          <label className={labelCls}>Telefono</label>
          <input className={inputCls} value={f.telefono} onChange={e => set('telefono', e.target.value)} />
        </div>
      </div>
      <div>
        <p className={sectionCls}>Referente sede</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Nome</label>
            <input className={inputCls} value={f.referente_nome} onChange={e => set('referente_nome', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Telefono</label>
            <input className={inputCls} value={f.referente_telefono} onChange={e => set('referente_telefono', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={f.referente_email} onChange={e => set('referente_email', e.target.value)} />
          </div>
        </div>
      </div>
      <div>
        <label className={labelCls}>Note</label>
        <textarea className={inputCls} rows={2} value={f.note} onChange={e => set('note', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Annulla
        </button>
        <button type="button" disabled={saving} onClick={() => onSave(f)}
          className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvataggio...' : 'Salva sede'}
        </button>
      </div>
    </div>
  )
}

// ── Tab Sedi ──────────────────────────────────────────────────────────────────

function SediTab({ clienteId }) {
  const [sedi, setSedi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const loadSedi = useCallback(() => {
    setLoading(true)
    axios.get(`/api/clienti-diretti/${clienteId}/sedi`)
      .then(r => setSedi(r.data))
      .finally(() => setLoading(false))
  }, [clienteId])

  useEffect(() => { loadSedi() }, [loadSedi])

  const handleCreate = async (data) => {
    setSavingId('new')
    try {
      await axios.post(`/api/clienti-diretti/${clienteId}/sedi`, data)
      setShowNew(false)
      loadSedi()
    } finally { setSavingId(null) }
  }

  const handleUpdate = async (sid, data) => {
    setSavingId(sid)
    try {
      await axios.put(`/api/clienti-diretti/${clienteId}/sedi/${sid}`, data)
      setEditingId(null)
      loadSedi()
    } finally { setSavingId(null) }
  }

  const handleDelete = async (sid) => {
    if (!confirm('Eliminare questa sede?')) return
    await axios.delete(`/api/clienti-diretti/${clienteId}/sedi/${sid}`)
    loadSedi()
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Caricamento...</div>

  return (
    <div className="space-y-3">
      {sedi.length === 0 && !showNew && (
        <div className="py-8 text-center text-sm text-gray-400">
          Nessuna sede aggiuntiva. Clicca "Aggiungi sede" per inserirne una.
        </div>
      )}

      {sedi.map(sede => (
        <div key={sede.id} className="border border-gray-100 rounded-xl overflow-hidden">
          {editingId === sede.id ? (
            <div className="p-3">
              <SedeForm
                initial={sede}
                onSave={data => handleUpdate(sede.id, data)}
                onCancel={() => setEditingId(null)}
                saving={savingId === sede.id}
              />
            </div>
          ) : (
            <div className="p-4 flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                {sede.nome && <p className="text-sm font-semibold text-gray-900">{sede.nome}</p>}
                {(sede.via || sede.citta) && (
                  <p className="text-xs text-gray-500">
                    {[sede.via && `${sede.via}${sede.civico ? ` ${sede.civico}` : ''}`,
                      sede.cap, sede.citta, sede.provincia].filter(Boolean).join(', ')}
                  </p>
                )}
                {sede.telefono && <p className="text-xs text-gray-500">📞 {sede.telefono}</p>}
                {(sede.referente_nome || sede.referente_email || sede.referente_telefono) && (
                  <p className="text-xs text-gray-400">
                    Ref: {[sede.referente_nome, sede.referente_telefono, sede.referente_email].filter(Boolean).join(' · ')}
                  </p>
                )}
                {sede.note && <p className="text-xs text-gray-400 italic">{sede.note}</p>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => setEditingId(sede.id)} className="text-xs font-medium text-blue-600 hover:text-blue-800">Modifica</button>
                <button onClick={() => handleDelete(sede.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Elimina</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <SedeForm
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          saving={savingId === 'new'}
        />
      ) : (
        <button onClick={() => setShowNew(true)}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Aggiungi sede
        </button>
      )}
    </div>
  )
}

// ── Pagina principale ─────────────────────────────────────────────────────────

export default function ClientiDirettiPage() {
  const [clienti, setClienti] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = () =>
    clientiDirettiApi.list(search ? { search } : {}).then(r => setClienti(r.data))

  useEffect(() => { load() }, [search])  // eslint-disable-line

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setEditing(null); setForm(emptyForm); setError(null); setShowForm(true)
  }

  const openEdit = (c) => {
    setEditing(c.id); setForm({ ...emptyForm, ...c }); setError(null); setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (editing) {
        await clientiDirettiApi.update(editing, form)
      } else {
        await clientiDirettiApi.create(form)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo cliente e tutte le sue sedi?')) return
    await clientiDirettiApi.delete(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Clienti Diretti</h1>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nuovo Cliente
        </button>
      </div>

      <div className="relative">
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          placeholder="Cerca per ragione sociale, P.IVA, città, referente..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ragione Sociale</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">P.IVA</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Città</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Referente</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contatti</th>
              <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clienti.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">Nessun cliente trovato</td></tr>
            )}
            {clienti.map(c => (
              <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {c.ragione_sociale}
                  {c.sedi?.length > 0 && (
                    <span className="ml-2 text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      +{c.sedi.length} {c.sedi.length === 1 ? 'sede' : 'sedi'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500">{c.partita_iva || '—'}</td>
                <td className="px-5 py-3 text-gray-500">
                  {[c.citta, c.provincia].filter(Boolean).join(' (') + (c.provincia ? ')' : '') || '—'}
                </td>
                <td className="px-5 py-3 text-gray-500">{c.referente_nome || '—'}</td>
                <td className="px-5 py-3 text-gray-500">
                  <div>{c.telefono || ''}</div>
                  <div className="text-xs text-blue-500">{c.email || ''}</div>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => openEdit(c)} className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3">Modifica</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">{editing ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg">✕</button>
            </div>

            <div className="overflow-y-auto flex-1">
              <form id="cliente-form" onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <p className={sectionCls}>Anagrafica</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Ragione Sociale *</label>
                      <input className={inputCls} required value={form.ragione_sociale} onChange={e => set('ragione_sociale', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Partita IVA</label>
                      <input className={inputCls} value={form.partita_iva} onChange={e => set('partita_iva', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Codice Fiscale</label>
                      <input className={inputCls} value={form.codice_fiscale} onChange={e => set('codice_fiscale', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className={sectionCls}>Sede Legale</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3">
                      <label className={labelCls}>Via</label>
                      <input className={inputCls} value={form.via} onChange={e => set('via', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Civico</label>
                      <input className={inputCls} value={form.civico} onChange={e => set('civico', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>CAP</label>
                      <input className={inputCls} value={form.cap} onChange={e => set('cap', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Città</label>
                      <input className={inputCls} value={form.citta} onChange={e => set('citta', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Provincia</label>
                      <input className={inputCls} value={form.provincia} onChange={e => set('provincia', e.target.value)} maxLength={5} />
                    </div>
                  </div>
                </div>

                {editing && (
                  <div>
                    <p className={sectionCls}>Sedi aggiuntive</p>
                    <SediTab clienteId={editing} />
                  </div>
                )}

                <div>
                  <p className={sectionCls}>Contatti Aziendali</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Telefono</label>
                      <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>PEC</label>
                      <input className={inputCls} value={form.pec} onChange={e => set('pec', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Sito Web</label>
                      <input className={inputCls} value={form.sito_web} onChange={e => set('sito_web', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className={sectionCls}>Referente Principale</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nome</label>
                      <input className={inputCls} value={form.referente_nome} onChange={e => set('referente_nome', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Ruolo</label>
                      <input className={inputCls} value={form.referente_ruolo} onChange={e => set('referente_ruolo', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Telefono Referente</label>
                      <input className={inputCls} value={form.referente_telefono} onChange={e => set('referente_telefono', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Email Referente</label>
                      <input className={inputCls} type="email" value={form.referente_email} onChange={e => set('referente_email', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Note</label>
                  <textarea className={inputCls} rows={3} value={form.note} onChange={e => set('note', e.target.value)} />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{error}</p>
                )}
              </form>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
                Annulla
              </button>
              <button type="submit" form="cliente-form" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
