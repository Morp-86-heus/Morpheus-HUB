import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { listiniApi } from '../api/client'

// ── Clienti Diretti ──────────────────────────────────────────────────────────

const emptyCD = {
  ragione_sociale: '', partita_iva: '', codice_fiscale: '',
  via: '', civico: '', cap: '', citta: '', provincia: '', regione: '',
  telefono: '', email: '', pec: '', sito_web: '',
  referente_nome: '', referente_ruolo: '', referente_telefono: '', referente_email: '',
  note: '',
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function CDForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyCD)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inp = (k, placeholder = '', type = 'text') => (
    <input
      type={type}
      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      value={form[k] || ''}
      onChange={e => set(k, e.target.value)}
      placeholder={placeholder}
    />
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try { await onSave(form) }
    catch (err) { setError(err.response?.data?.detail || 'Errore') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Dati societari */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dati societari</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <Field label="Ragione Sociale *">{inp('ragione_sociale', 'Azienda S.r.l.')}</Field>
          </div>
          <Field label="Partita IVA">{inp('partita_iva', '01234567890')}</Field>
          <Field label="Codice Fiscale">{inp('codice_fiscale', '01234567890')}</Field>
          <Field label="Sito Web">{inp('sito_web', 'https://...')}</Field>
        </div>
      </div>

      {/* Sede */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sede legale</h4>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-4"><Field label="Via">{inp('via', 'Via Roma')}</Field></div>
          <div className="col-span-2"><Field label="Civico">{inp('civico', '1')}</Field></div>
          <div className="col-span-1"><Field label="CAP">{inp('cap', '70100')}</Field></div>
          <div className="col-span-3"><Field label="Città">{inp('citta', 'Bari')}</Field></div>
          <div className="col-span-1"><Field label="Prov.">
            <input
              maxLength={2}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
              value={form.provincia || ''}
              onChange={e => set('provincia', e.target.value.toUpperCase())}
              placeholder="BA"
            />
          </Field></div>
          <div className="col-span-2"><Field label="Regione">{inp('regione', 'Puglia')}</Field></div>
        </div>
      </div>

      {/* Contatti aziendali */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contatti aziendali</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Telefono">{inp('telefono', '+39 080 1234567')}</Field>
          <Field label="Email">{inp('email', 'info@azienda.it', 'email')}</Field>
          <Field label="PEC">{inp('pec', 'azienda@pec.it', 'email')}</Field>
        </div>
      </div>

      {/* Referente */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Referente principale</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome e Cognome">{inp('referente_nome', 'Mario Rossi')}</Field>
          <Field label="Ruolo / Qualifica">{inp('referente_ruolo', 'Responsabile IT')}</Field>
          <Field label="Telefono">{inp('referente_telefono', '+39 333 1234567')}</Field>
          <Field label="Email">{inp('referente_email', 'mario.rossi@azienda.it', 'email')}</Field>
        </div>
      </div>

      {/* Note */}
      <div>
        <Field label="Note interne">
          <textarea
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.note || ''}
            onChange={e => set('note', e.target.value)}
            placeholder="Note aggiuntive..."
          />
        </Field>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Crea cliente'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
          Annulla
        </button>
      </div>
    </form>
  )
}

function ClientiDirettiTab({ canEdit }) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)   // dettaglio aperto
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    axios.get(`/api/clienti-diretti${params}`).then(r => setItems(r.data))
  }

  useEffect(() => { load() }, [search])

  const handleCreate = async (form) => {
    await axios.post('/api/clienti-diretti', form)
    setShowForm(false); load()
  }

  const handleUpdate = async (form) => {
    await axios.put(`/api/clienti-diretti/${editing.id}`, form)
    setEditing(null); setSelected(null); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo cliente diretto?')) return
    await axios.delete(`/api/clienti-diretti/${id}`)
    setSelected(null); load()
  }

  if (showForm) return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-700 mb-5">Nuovo cliente diretto</h3>
      <CDForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
    </div>
  )

  if (editing) return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-700 mb-5">Modifica — {editing.ragione_sociale}</h3>
      <CDForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Cerca per ragione sociale, città, email, referente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {canEdit && (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
            + Nuovo cliente
          </button>
        )}
        <span className="text-sm text-gray-400 whitespace-nowrap">{items.length} clienti</span>
      </div>

      {/* Lista + dettaglio affiancato */}
      <div className={`grid gap-4 ${selected ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Lista */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ragione Sociale</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Città</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Referente</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Telefono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Nessun cliente trovato</td></tr>
              )}
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  className={`cursor-pointer transition-colors ${selected?.id === item.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.ragione_sociale}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{[item.citta, item.provincia].filter(Boolean).join(' (') + (item.provincia ? ')' : '')}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.referente_nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.telefono || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pannello dettaglio */}
        {selected && (
          <div className="bg-white rounded-lg shadow p-5 space-y-4 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">{selected.ragione_sociale}</h3>
                {selected.sito_web && <a href={selected.sito_web} target="_blank" rel="noreferrer" className="text-blue-500 text-xs hover:underline">{selected.sito_web}</a>}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {/* Dati fiscali */}
            <div className="grid grid-cols-2 gap-2">
              {[['P.IVA', selected.partita_iva], ['C.F.', selected.codice_fiscale]].map(([l, v]) => v ? (
                <div key={l}><span className="text-gray-400">{l}: </span><span className="font-mono">{v}</span></div>
              ) : null)}
            </div>

            {/* Sede */}
            {(selected.via || selected.citta) && (
              <div className="border-t pt-3">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Sede legale</div>
                <div>{[selected.via, selected.civico].filter(Boolean).join(' ')}</div>
                <div>{[selected.cap, selected.citta, selected.provincia ? `(${selected.provincia})` : null].filter(Boolean).join(' ')}</div>
                {selected.regione && <div className="text-gray-400">{selected.regione}</div>}
              </div>
            )}

            {/* Contatti */}
            <div className="border-t pt-3 space-y-1">
              <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Contatti</div>
              {selected.telefono && <div>📞 <a href={`tel:${selected.telefono}`} className="text-blue-600 hover:underline">{selected.telefono}</a></div>}
              {selected.email && <div>✉️ <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a></div>}
              {selected.pec && <div>📧 PEC: <a href={`mailto:${selected.pec}`} className="text-blue-600 hover:underline">{selected.pec}</a></div>}
            </div>

            {/* Referente */}
            {selected.referente_nome && (
              <div className="border-t pt-3 space-y-1">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Referente</div>
                <div className="font-medium">{selected.referente_nome}{selected.referente_ruolo ? ` — ${selected.referente_ruolo}` : ''}</div>
                {selected.referente_telefono && <div>📞 <a href={`tel:${selected.referente_telefono}`} className="text-blue-600 hover:underline">{selected.referente_telefono}</a></div>}
                {selected.referente_email && <div>✉️ <a href={`mailto:${selected.referente_email}`} className="text-blue-600 hover:underline">{selected.referente_email}</a></div>}
              </div>
            )}

            {/* Note */}
            {selected.note && (
              <div className="border-t pt-3">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Note</div>
                <div className="text-gray-600 whitespace-pre-wrap">{selected.note}</div>
              </div>
            )}

            <ListinoPanel commitenteNome={selected.nome} canEdit={canEdit} />

            {canEdit && (
              <div className="border-t pt-3 flex gap-2">
                <button onClick={() => setEditing(selected)}
                  className="flex-1 bg-blue-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-700">
                  Modifica
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">
                  Elimina
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Gestione Listino prezzi ───────────────────────────────────────────────────
function ListinoPanel({ commitenteNome, canEdit }) {
  const [listini, setListini] = useState([])
  const [selectedListino, setSelectedListino] = useState(null)
  const [showNewListino, setShowNewListino] = useState(false)
  const [nuovoNome, setNuovoNome] = useState('')
  const [editingVoce, setEditingVoce] = useState(null) // {id?, descrizione, prezzo, unita_misura}
  const [showNewVoce, setShowNewVoce] = useState(false)
  const [newVoce, setNewVoce] = useState({ descrizione: '', prezzo: '', unita_misura: '' })

  const load = () =>
    listiniApi.list(commitenteNome).then(r => {
      setListini(r.data)
      if (r.data.length > 0 && !selectedListino)
        setSelectedListino(r.data[0])
      else if (r.data.length > 0 && selectedListino)
        setSelectedListino(r.data.find(l => l.id === selectedListino.id) || r.data[0])
      else
        setSelectedListino(null)
    })

  useEffect(() => { load() }, [commitenteNome])

  const inpCls = 'border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400'

  const handleCreateListino = async () => {
    if (!nuovoNome.trim()) return
    await listiniApi.create({ commitente: commitenteNome, nome: nuovoNome.trim() })
    setNuovoNome(''); setShowNewListino(false); load()
  }

  const handleDeleteListino = async (id) => {
    if (!confirm('Eliminare questo listino e tutte le sue voci?')) return
    await listiniApi.delete(id)
    load()
  }

  const handleAddVoce = async () => {
    if (!newVoce.descrizione.trim() || !selectedListino) return
    await listiniApi.addVoce(selectedListino.id, newVoce)
    setNewVoce({ descrizione: '', prezzo: '', unita_misura: '' }); setShowNewVoce(false); load()
  }

  const handleUpdateVoce = async () => {
    if (!editingVoce || !selectedListino) return
    await listiniApi.updateVoce(selectedListino.id, editingVoce.id,
      { descrizione: editingVoce.descrizione, prezzo: editingVoce.prezzo, unita_misura: editingVoce.unita_misura })
    setEditingVoce(null); load()
  }

  const handleDeleteVoce = async (vid) => {
    if (!selectedListino) return
    await listiniApi.deleteVoce(selectedListino.id, vid); load()
  }

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 uppercase font-semibold">Listino prezzi</div>
        {canEdit && (
          <button onClick={() => setShowNewListino(v => !v)}
            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100">
            + Nuovo listino
          </button>
        )}
      </div>

      {showNewListino && (
        <div className="flex gap-2">
          <input className={`${inpCls} flex-1`} placeholder="Nome listino (es. Standard 2026)"
            value={nuovoNome} onChange={e => setNuovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateListino()} />
          <button onClick={handleCreateListino}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Crea</button>
          <button onClick={() => setShowNewListino(false)}
            className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-500">✕</button>
        </div>
      )}

      {listini.length === 0 && !showNewListino && (
        <p className="text-xs text-gray-400 italic">Nessun listino. Creane uno con "+ Nuovo listino".</p>
      )}

      {listini.length > 0 && (
        <>
          {/* Selezione listino */}
          <div className="flex flex-wrap gap-1">
            {listini.map(l => (
              <button key={l.id} onClick={() => setSelectedListino(l)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${selectedListino?.id === l.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {l.nome}
              </button>
            ))}
          </div>

          {/* Voci del listino selezionato */}
          {selectedListino && (
            <div className="rounded border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
                <span className="text-xs font-medium text-gray-600">{selectedListino.nome}</span>
                {canEdit && (
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewVoce(v => !v)}
                      className="text-xs text-blue-600 hover:underline">+ Voce</button>
                    <button onClick={() => handleDeleteListino(selectedListino.id)}
                      className="text-xs text-red-500 hover:underline">Elimina listino</button>
                  </div>
                )}
              </div>

              {showNewVoce && canEdit && (
                <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <div className="text-xs text-gray-500 mb-0.5">Descrizione *</div>
                    <input className={`${inpCls} w-full`} placeholder="es. Visita tecnica"
                      value={newVoce.descrizione} onChange={e => setNewVoce(v => ({ ...v, descrizione: e.target.value }))} />
                  </div>
                  <div className="w-24">
                    <div className="text-xs text-gray-500 mb-0.5">Prezzo (€)</div>
                    <input className={`${inpCls} w-full`} placeholder="80.00"
                      value={newVoce.prezzo} onChange={e => setNewVoce(v => ({ ...v, prezzo: e.target.value }))} />
                  </div>
                  <div className="w-20">
                    <div className="text-xs text-gray-500 mb-0.5">U.M.</div>
                    <input className={`${inpCls} w-full`} placeholder="ora"
                      value={newVoce.unita_misura} onChange={e => setNewVoce(v => ({ ...v, unita_misura: e.target.value }))} />
                  </div>
                  <button onClick={handleAddVoce}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Aggiungi</button>
                  <button onClick={() => setShowNewVoce(false)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-500">✕</button>
                </div>
              )}

              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-gray-500 font-semibold uppercase">Descrizione</th>
                    <th className="px-3 py-1.5 text-right text-gray-500 font-semibold uppercase w-20">Prezzo</th>
                    <th className="px-3 py-1.5 text-left text-gray-500 font-semibold uppercase w-16">U.M.</th>
                    {canEdit && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedListino.voci.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-3 text-center text-gray-400 italic">Nessuna voce. Usa "+ Voce" per aggiungerne.</td></tr>
                  )}
                  {selectedListino.voci.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      {editingVoce?.id === v.id ? (
                        <>
                          <td className="px-3 py-1.5">
                            <input className={`${inpCls} w-full`} value={editingVoce.descrizione}
                              onChange={e => setEditingVoce(ev => ({ ...ev, descrizione: e.target.value }))} />
                          </td>
                          <td className="px-3 py-1.5">
                            <input className={`${inpCls} w-full text-right`} value={editingVoce.prezzo || ''}
                              onChange={e => setEditingVoce(ev => ({ ...ev, prezzo: e.target.value }))} />
                          </td>
                          <td className="px-3 py-1.5">
                            <input className={`${inpCls} w-full`} value={editingVoce.unita_misura || ''}
                              onChange={e => setEditingVoce(ev => ({ ...ev, unita_misura: e.target.value }))} />
                          </td>
                          <td className="px-3 py-1.5 flex gap-1">
                            <button onClick={handleUpdateVoce} className="text-blue-600 hover:underline">✓</button>
                            <button onClick={() => setEditingVoce(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5 text-gray-800">{v.descrizione}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700 font-mono">
                            {v.prezzo ? `€ ${v.prezzo}` : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{v.unita_misura || '—'}</td>
                          {canEdit && (
                            <td className="px-3 py-1.5">
                              <div className="flex gap-2">
                                <button onClick={() => setEditingVoce({ ...v })} className="text-blue-500 hover:underline">✎</button>
                                <button onClick={() => handleDeleteVoce(v.id)} className="text-red-400 hover:text-red-600">✕</button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const api = {
  commitenti: {
    list: (search) => axios.get('/api/lookup/commitenti/full', { params: search ? { search } : {} }),
    create: (data) => axios.post('/api/lookup/commitenti', data),
    update: (id, data) => axios.put(`/api/lookup/commitenti/${id}`, data),
    delete: (id) => axios.delete(`/api/lookup/commitenti/${id}`),
  },
  clienti: {
    list: () => axios.get('/api/lookup/clienti'),
    create: (nome, commitente) => axios.post(`/api/lookup/clienti?nome=${encodeURIComponent(nome)}&commitente=${encodeURIComponent(commitente)}`),
    update: (id, nome, commitente) => axios.put(`/api/lookup/clienti/${id}?nome=${encodeURIComponent(nome)}&commitente=${encodeURIComponent(commitente)}`),
    delete: (id) => axios.delete(`/api/lookup/clienti/${id}`),
  },
}

const emptyC = {
  nome: '', partita_iva: '', codice_fiscale: '',
  via: '', civico: '', cap: '', citta: '', provincia: '', regione: '',
  telefono: '', email: '', pec: '', sito_web: '',
  referente_nome: '', referente_ruolo: '', referente_telefono: '', referente_email: '',
  note: '',
}

function CForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyC)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inp = (k, placeholder = '', type = 'text') => (
    <input
      type={type}
      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      value={form[k] || ''}
      onChange={e => set(k, e.target.value)}
      placeholder={placeholder}
    />
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try { await onSave(form) }
    catch (err) { setError(err.response?.data?.detail || 'Errore') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dati societari</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <Field label="Nome commitente *">{inp('nome', 'BPP S.r.l.')}</Field>
          </div>
          <Field label="Partita IVA">{inp('partita_iva', '01234567890')}</Field>
          <Field label="Codice Fiscale">{inp('codice_fiscale', '01234567890')}</Field>
          <Field label="Sito Web">{inp('sito_web', 'https://...')}</Field>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sede legale</h4>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-4"><Field label="Via">{inp('via', 'Via Roma')}</Field></div>
          <div className="col-span-2"><Field label="Civico">{inp('civico', '1')}</Field></div>
          <div className="col-span-1"><Field label="CAP">{inp('cap', '70100')}</Field></div>
          <div className="col-span-3"><Field label="Città">{inp('citta', 'Bari')}</Field></div>
          <div className="col-span-1"><Field label="Prov.">
            <input maxLength={2}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
              value={form.provincia || ''} onChange={e => set('provincia', e.target.value.toUpperCase())} placeholder="BA" />
          </Field></div>
          <div className="col-span-2"><Field label="Regione">{inp('regione', 'Puglia')}</Field></div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contatti aziendali</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Telefono">{inp('telefono', '+39 080 1234567')}</Field>
          <Field label="Email">{inp('email', 'info@azienda.it', 'email')}</Field>
          <Field label="PEC">{inp('pec', 'azienda@pec.it', 'email')}</Field>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Referente principale</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome e Cognome">{inp('referente_nome', 'Mario Rossi')}</Field>
          <Field label="Ruolo / Qualifica">{inp('referente_ruolo', 'Responsabile IT')}</Field>
          <Field label="Telefono">{inp('referente_telefono', '+39 333 1234567')}</Field>
          <Field label="Email">{inp('referente_email', 'mario.rossi@azienda.it', 'email')}</Field>
        </div>
      </div>

      <div>
        <Field label="Note interne">
          <textarea rows={3}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.note || ''} onChange={e => set('note', e.target.value)} placeholder="Note aggiuntive..." />
        </Field>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Crea commitente'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
          Annulla
        </button>
      </div>
    </form>
  )
}

function CommitentiTab({ canEdit }) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => api.commitenti.list(search).then(r => setItems(r.data))
  useEffect(() => { load() }, [search])

  const handleCreate = async (form) => {
    await api.commitenti.create(form)
    setShowForm(false); load()
  }

  const handleUpdate = async (form) => {
    await api.commitenti.update(editing.id, form)
    setEditing(null); setSelected(null); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo commitente? I clienti associati perderanno il collegamento.')) return
    await api.commitenti.delete(id)
    setSelected(null); load()
  }

  if (showForm) return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-700 mb-5">Nuovo commitente</h3>
      <CForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
    </div>
  )

  if (editing) return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold text-gray-700 mb-5">Modifica — {editing.nome}</h3>
      <CForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input type="text" placeholder="Cerca per nome, città, email, referente..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        {canEdit && (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
            + Nuovo commitente
          </button>
        )}
        <span className="text-sm text-gray-400 whitespace-nowrap">{items.length} commitenti</span>
      </div>

      <div className={`grid gap-4 ${selected ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Città</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Referente</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Telefono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Nessun commitente trovato</td></tr>
              )}
              {items.map(item => (
                <tr key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  className={`cursor-pointer transition-colors ${selected?.id === item.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{[item.citta, item.provincia].filter(Boolean).join(' (') + (item.provincia ? ')' : '')}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.referente_nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.telefono || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white rounded-lg shadow p-5 space-y-4 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">{selected.nome}</h3>
                {selected.sito_web && <a href={selected.sito_web} target="_blank" rel="noreferrer" className="text-blue-500 text-xs hover:underline">{selected.sito_web}</a>}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[['P.IVA', selected.partita_iva], ['C.F.', selected.codice_fiscale]].map(([l, v]) => v ? (
                <div key={l}><span className="text-gray-400">{l}: </span><span className="font-mono">{v}</span></div>
              ) : null)}
            </div>

            {(selected.via || selected.citta) && (
              <div className="border-t pt-3">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Sede legale</div>
                <div>{[selected.via, selected.civico].filter(Boolean).join(' ')}</div>
                <div>{[selected.cap, selected.citta, selected.provincia ? `(${selected.provincia})` : null].filter(Boolean).join(' ')}</div>
                {selected.regione && <div className="text-gray-400">{selected.regione}</div>}
              </div>
            )}

            <div className="border-t pt-3 space-y-1">
              <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Contatti</div>
              {selected.telefono && <div>📞 <a href={`tel:${selected.telefono}`} className="text-blue-600 hover:underline">{selected.telefono}</a></div>}
              {selected.email && <div>✉️ <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a></div>}
              {selected.pec && <div>📧 PEC: <a href={`mailto:${selected.pec}`} className="text-blue-600 hover:underline">{selected.pec}</a></div>}
            </div>

            {selected.referente_nome && (
              <div className="border-t pt-3 space-y-1">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Referente</div>
                <div className="font-medium">{selected.referente_nome}{selected.referente_ruolo ? ` — ${selected.referente_ruolo}` : ''}</div>
                {selected.referente_telefono && <div>📞 <a href={`tel:${selected.referente_telefono}`} className="text-blue-600 hover:underline">{selected.referente_telefono}</a></div>}
                {selected.referente_email && <div>✉️ <a href={`mailto:${selected.referente_email}`} className="text-blue-600 hover:underline">{selected.referente_email}</a></div>}
              </div>
            )}

            {selected.note && (
              <div className="border-t pt-3">
                <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Note</div>
                <div className="text-gray-600 whitespace-pre-wrap">{selected.note}</div>
              </div>
            )}

            {canEdit && (
              <div className="border-t pt-3 flex gap-2">
                <button onClick={() => setEditing(selected)}
                  className="flex-1 bg-blue-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-700">
                  Modifica
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">
                  Elimina
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ClientiTab({ canEdit }) {
  const [clienti, setClienti] = useState([])
  const [commitenti, setCommitenti] = useState([])
  const [form, setForm] = useState({ nome: '', commitente: '' })
  const [editing, setEditing] = useState(null)
  const [filtroCommitente, setFiltroCommitente] = useState('')
  const [error, setError] = useState(null)

  const loadClienti = () => api.clienti.list().then(r => setClienti(r.data))
  const loadCommitenti = () => api.commitenti.list().then(r => setCommitenti(r.data))

  useEffect(() => { loadClienti(); loadCommitenti() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (editing) {
        await api.clienti.update(editing, form.nome, form.commitente)
      } else {
        await api.clienti.create(form.nome, form.commitente)
      }
      setForm({ nome: '', commitente: '' }); setEditing(null); loadClienti()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore')
    }
  }

  const startEdit = (item) => {
    setEditing(item.id)
    setForm({ nome: item.nome, commitente: item.commitente || '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo cliente?')) return
    await api.clienti.delete(id)
    loadClienti()
  }

  const displayed = filtroCommitente
    ? clienti.filter(c => c.commitente === filtroCommitente)
    : clienti

  // Raggruppa per commitente
  const grouped = displayed.reduce((acc, c) => {
    const key = c.commitente || '(nessuno)'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {canEdit && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-4">{editing ? 'Modifica cliente' : 'Nuovo cliente'}</h3>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Commitente *</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.commitente}
                onChange={e => set('commitente', e.target.value)}
                required
              >
                <option value="">— Seleziona —</option>
                {commitenti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome cliente *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Nome cliente"
                required
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700">
                {editing ? 'Aggiorna' : 'Crea'}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm({ nome: '', commitente: '' }) }}
                  className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
                  ✕
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className={`${canEdit ? 'md:col-span-2' : 'md:col-span-3'} space-y-3`}>
        {/* Filtro per commitente */}
        <div className="flex gap-2 items-center">
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={filtroCommitente}
            onChange={e => setFiltroCommitente(e.target.value)}
          >
            <option value="">Tutti i commitenti</option>
            {commitenti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <span className="text-sm text-gray-400">{displayed.length} clienti</span>
        </div>

        {/* Lista raggruppata */}
        {Object.entries(grouped).sort().map(([commitente, items]) => (
          <div key={commitente} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">
              {commitente} <span className="font-normal text-blue-400">({items.length})</span>
            </div>
            <table className="min-w-full divide-y divide-gray-100">
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-800">{item.nome}</td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => startEdit(item)} className="text-xs text-blue-600 hover:underline">Modifica</button>
                          <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:underline">Elimina</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnagrafichePage() {
  const { can } = useAuth()
  const canEdit = can('anagrafiche.edit') || can('anagrafiche.create')
  const [tab, setTab] = useState('commitenti')

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Anagrafiche</h1>

      <div className="flex border-b border-gray-200">
        {[['commitenti', 'Commitenti'], ['clienti', 'Clienti'], ['diretti', 'Clienti Diretti']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'commitenti' && <CommitentiTab canEdit={canEdit} />}
      {tab === 'clienti' && <ClientiTab canEdit={canEdit} />}
      {tab === 'diretti' && <ClientiDirettiTab canEdit={canEdit} />}
    </div>
  )
}
