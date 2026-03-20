import { useState, useEffect } from 'react'
import axios from 'axios'

const emptyForm = {
  ragione_sociale: '', partita_iva: '', codice_fiscale: '',
  via: '', civico: '', cap: '', citta: '', provincia: '', regione: '',
  telefono: '', email: '', pec: '', sito_web: '',
  referente_nome: '', referente_ruolo: '', referente_telefono: '', referente_email: '',
  note: ''
}

export default function ClientiDirettiPage() {
  const [clienti, setClienti] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = () => axios.get('/api/clienti-diretti', { params: search ? { search } : {} }).then(r => setClienti(r.data))
  useEffect(() => { load() }, [search])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await axios.put(`/api/clienti-diretti/${editing}`, form)
      } else {
        await axios.post('/api/clienti-diretti', form)
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (c) => {
    setEditing(c.id)
    setForm({ ...emptyForm, ...c })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo cliente?')) return
    await axios.delete(`/api/clienti-diretti/${id}`)
    load()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"
  const sectionCls = "text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-3"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Clienti Diretti</h1>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nuovo Cliente
        </button>
      </div>

      {/* Barra ricerca */}
      <div className="relative">
        <input
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          placeholder="Cerca per ragione sociale, P.IVA, città, referente..." value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Tabella */}
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
                <td className="px-5 py-3 font-medium text-gray-900">{c.ragione_sociale}</td>
                <td className="px-5 py-3 text-gray-500">{c.partita_iva || '—'}</td>
                <td className="px-5 py-3 text-gray-500">{[c.citta, c.provincia].filter(Boolean).join(' (') + (c.provincia ? ')' : '')}</td>
                <td className="px-5 py-3 text-gray-500">{c.referente_nome || '—'}</td>
                <td className="px-5 py-3 text-gray-500">
                  <div>{c.telefono || ''}</div>
                  <div className="text-xs text-blue-500">{c.email || ''}</div>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleEdit(c)} className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3">Modifica</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">{editing ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
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
                <p className={sectionCls}>Sede</p>
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
                <p className={sectionCls}>Referente</p>
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
