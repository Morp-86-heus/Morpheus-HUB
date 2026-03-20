import { useState, useEffect } from 'react'
import axios from 'axios'

const CATEGORIE = [
  { value: 'prodotto', label: 'Prodotto', color: 'bg-blue-100 text-blue-700' },
  { value: 'servizio', label: 'Servizio', color: 'bg-purple-100 text-purple-700' },
]
const FATTURAZIONE = [
  { value: 'una_tantum', label: 'Una tantum' },
  { value: 'mensile', label: 'Mensile' },
  { value: 'trimestrale', label: 'Trimestrale' },
  { value: 'semestrale', label: 'Semestrale' },
  { value: 'annuale', label: 'Annuale' },
]

const emptyForm = {
  nome: '', descrizione: '', categoria: 'servizio', tipo_fatturazione: 'una_tantum',
  prezzo: '', unita: '', attivo: true,
  codice_sku: '', marca: '', modello: '', numero_seriale: '', numero_licenza: '',
  fornitore: '', data_acquisto: '', garanzia_scadenza: '',
  url_documentazione: '', note_tecniche: '',
}

function fmtPrezzo(centesimi) {
  if (centesimi == null) return '—'
  return `€ ${(centesimi / 100).toFixed(2)}`
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT')
}

function GaranziaBadge({ data }) {
  if (!data) return null
  const diff = Math.ceil((new Date(data) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return <span className="ml-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Scaduta</span>
  if (diff <= 30) return <span className="ml-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">In scadenza</span>
  return null
}

export default function ServiziPage() {
  const [servizi, setServizi] = useState([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = () => axios.get('/api/servizi', {
    params: { ...(search ? { search } : {}), ...(filterCat ? { categoria: filterCat } : {}) }
  }).then(r => setServizi(r.data))

  useEffect(() => { load() }, [search, filterCat])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        prezzo: form.prezzo !== '' ? Math.round(parseFloat(form.prezzo) * 100) : null,
        codice_sku: form.codice_sku || null,
        marca: form.marca || null,
        modello: form.modello || null,
        numero_seriale: form.numero_seriale || null,
        numero_licenza: form.numero_licenza || null,
        fornitore: form.fornitore || null,
        data_acquisto: form.data_acquisto || null,
        garanzia_scadenza: form.garanzia_scadenza || null,
        url_documentazione: form.url_documentazione || null,
        note_tecniche: form.note_tecniche || null,
      }
      if (editing) {
        await axios.put(`/api/servizi/${editing}`, payload)
      } else {
        await axios.post('/api/servizi', payload)
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (s) => {
    setDetail(null)
    setEditing(s.id)
    setForm({
      ...s,
      prezzo: s.prezzo != null ? (s.prezzo / 100).toFixed(2) : '',
      data_acquisto: s.data_acquisto ? s.data_acquisto.slice(0, 10) : '',
      garanzia_scadenza: s.garanzia_scadenza ? s.garanzia_scadenza.slice(0, 10) : '',
      codice_sku: s.codice_sku || '',
      marca: s.marca || '',
      modello: s.modello || '',
      numero_seriale: s.numero_seriale || '',
      numero_licenza: s.numero_licenza || '',
      fornitore: s.fornitore || '',
      url_documentazione: s.url_documentazione || '',
      note_tecniche: s.note_tecniche || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo elemento dal catalogo?')) return
    await axios.delete(`/api/servizi/${id}`)
    if (detail?.id === id) setDetail(null)
    load()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"
  const sectionTitle = "text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-gray-100"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Catalogo Servizi &amp; Prodotti</h1>
        <button onClick={() => { setDetail(null); setEditing(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          + Nuovo
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            placeholder="Cerca per nome..." value={search} onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-1">
          {[{ value: '', label: 'Tutti' }, ...CATEGORIE].map(c => (
            <button key={c.value} onClick={() => setFilterCat(c.value)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${filterCat === c.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${detail ? 'flex-1' : 'w-full'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nome / Modello</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Categoria</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">SKU / Seriale</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prezzo</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stato</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {servizi.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">Nessun elemento nel catalogo</td></tr>
              )}
              {servizi.map(s => {
                const cat = CATEGORIE.find(c => c.value === s.categoria)
                const fatt = FATTURAZIONE.find(f => f.value === s.tipo_fatturazione)
                const isSelected = detail?.id === s.id
                return (
                  <tr key={s.id}
                    onClick={() => setDetail(isSelected ? null : s)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/30'}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{s.nome}</div>
                      {(s.marca || s.modello) && (
                        <div className="text-xs text-gray-400 mt-0.5">{[s.marca, s.modello].filter(Boolean).join(' — ')}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cat?.color}`}>{cat?.label}</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {s.codice_sku && <div className="text-xs text-gray-500 font-mono">{s.codice_sku}</div>}
                      {s.numero_seriale && <div className="text-xs text-gray-400 font-mono">{s.numero_seriale}</div>}
                      {!s.codice_sku && !s.numero_seriale && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-700 font-mono text-xs">
                      {fmtPrezzo(s.prezzo)}{s.unita ? ` / ${s.unita}` : ''}
                      {s.tipo_fatturazione !== 'una_tantum' && (
                        <div className="text-[10px] text-gray-400">{fatt?.label}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${s.attivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {s.attivo ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(s)} className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3">Modifica</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pannello dettaglio */}
        {detail && (
          <div className="w-80 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 self-start sticky top-4 space-y-4 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{detail.nome}</h3>
                {(detail.marca || detail.modello) && (
                  <p className="text-xs text-gray-400 mt-0.5">{[detail.marca, detail.modello].filter(Boolean).join(' — ')}</p>
                )}
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
            </div>

            {detail.descrizione && (
              <p className="text-xs text-gray-500 leading-relaxed">{detail.descrizione}</p>
            )}

            <div className="space-y-2.5">
              {detail.codice_sku && <InfoRow label="SKU" value={<span className="font-mono">{detail.codice_sku}</span>} />}
              {detail.numero_seriale && <InfoRow label="Seriale" value={<span className="font-mono">{detail.numero_seriale}</span>} />}
              {detail.numero_licenza && <InfoRow label="N° Licenza" value={<span className="font-mono">{detail.numero_licenza}</span>} />}
              {detail.fornitore && <InfoRow label="Fornitore" value={detail.fornitore} />}
              {detail.data_acquisto && <InfoRow label="Acquistato il" value={fmtDate(detail.data_acquisto)} />}
              {detail.garanzia_scadenza && (
                <InfoRow label="Garanzia" value={
                  <span className="flex items-center gap-1">
                    {fmtDate(detail.garanzia_scadenza)}
                    <GaranziaBadge data={detail.garanzia_scadenza} />
                  </span>
                } />
              )}
              {detail.url_documentazione && (
                <InfoRow label="Docs" value={
                  <a href={detail.url_documentazione} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate block max-w-[160px]">
                    {detail.url_documentazione}
                  </a>
                } />
              )}
            </div>

            {detail.note_tecniche && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Note tecniche</p>
                <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{detail.note_tecniche}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-50">
              <button onClick={() => handleEdit(detail)}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Modifica
              </button>
              <button onClick={() => handleDelete(detail.id)}
                className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                Elimina
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-sm font-semibold text-gray-900">{editing ? 'Modifica' : 'Nuovo'} {form.categoria === 'prodotto' ? 'Prodotto' : 'Servizio'}</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg">✕</button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6">

              {/* Sezione: Info base */}
              <div>
                <p className={sectionTitle}>Informazioni base</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Nome *</label>
                    <input className={inputCls} required value={form.nome} onChange={e => set('nome', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Descrizione</label>
                    <textarea className={inputCls} rows={2} value={form.descrizione || ''} onChange={e => set('descrizione', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Categoria</label>
                      <select className={inputCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                        {CATEGORIE.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Tipo Fatturazione</label>
                      <select className={inputCls} value={form.tipo_fatturazione} onChange={e => set('tipo_fatturazione', e.target.value)}>
                        {FATTURAZIONE.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Prezzo (€)</label>
                      <input className={inputCls} type="number" step="0.01" min="0" value={form.prezzo} onChange={e => set('prezzo', e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={labelCls}>Unità</label>
                      <input className={inputCls} value={form.unita || ''} onChange={e => set('unita', e.target.value)} placeholder="es. licenze, utenti, GB" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700">Attivo</label>
                    <button type="button" onClick={() => set('attivo', !form.attivo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.attivo ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.attivo ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sezione: Identificazione */}
              <div>
                <p className={sectionTitle}>Identificazione {form.categoria === 'prodotto' ? 'prodotto' : 'e riferimenti'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Codice SKU / Articolo</label>
                    <input className={inputCls} value={form.codice_sku} onChange={e => set('codice_sku', e.target.value)} placeholder="es. HP-LJ-001" />
                  </div>
                  <div>
                    <label className={labelCls}>Marca / Produttore</label>
                    <input className={inputCls} value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="es. HP, Canon, Microsoft" />
                  </div>
                  <div>
                    <label className={labelCls}>Modello</label>
                    <input className={inputCls} value={form.modello} onChange={e => set('modello', e.target.value)} placeholder="es. LaserJet Pro MFP" />
                  </div>
                  <div>
                    <label className={labelCls}>Numero Seriale</label>
                    <input className={inputCls} value={form.numero_seriale} onChange={e => set('numero_seriale', e.target.value)} placeholder="S/N del dispositivo" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Numero Licenza / Chiave</label>
                    <input className={inputCls} value={form.numero_licenza} onChange={e => set('numero_licenza', e.target.value)} placeholder="Chiave prodotto o numero contratto licenza" />
                  </div>
                </div>
              </div>

              {/* Sezione: Acquisto e garanzia */}
              <div>
                <p className={sectionTitle}>Acquisto e garanzia</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Fornitore / Rivenditore</label>
                    <input className={inputCls} value={form.fornitore} onChange={e => set('fornitore', e.target.value)} placeholder="Nome del fornitore" />
                  </div>
                  <div>
                    <label className={labelCls}>Data Acquisto</label>
                    <input className={inputCls} type="date" value={form.data_acquisto} onChange={e => set('data_acquisto', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Scadenza Garanzia</label>
                    <input className={inputCls} type="date" value={form.garanzia_scadenza} onChange={e => set('garanzia_scadenza', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sezione: Extra */}
              <div>
                <p className={sectionTitle}>Documentazione e note</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>URL Documentazione / Datasheet</label>
                    <input className={inputCls} type="url" value={form.url_documentazione} onChange={e => set('url_documentazione', e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <label className={labelCls}>Note Tecniche</label>
                    <textarea className={inputCls} rows={3} value={form.note_tecniche} onChange={e => set('note_tecniche', e.target.value)} placeholder="Configurazioni, istruzioni, note di installazione..." />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{error}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
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

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-gray-400 font-medium shrink-0">{label}</span>
      <span className="text-[12px] text-gray-700 text-right">{value}</span>
    </div>
  )
}
