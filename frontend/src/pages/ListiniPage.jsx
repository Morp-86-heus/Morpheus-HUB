import { useState, useEffect } from 'react'
import { listiniApi, lookupApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function ListinoForm({ initial, commitenti, onSave, onCancel }) {
  const [form, setForm] = useState({ commitente: '', nome: '', note: '', ...initial })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.commitente || !form.nome.trim()) { setErr('Commitente e nome sono obbligatori'); return }
    setSaving(true)
    try {
      await onSave(form)
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Errore salvataggio')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Commitente *</label>
        <select
          value={form.commitente}
          onChange={e => setForm(f => ({ ...f, commitente: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— seleziona —</option>
          {commitenti.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nome listino *</label>
        <input
          type="text"
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="es. Listino Standard 2026"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
        <textarea
          value={form.note || ''}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvo…' : 'Salva'}
        </button>
      </div>
    </form>
  )
}

function VoceForm({ initial, onSave, onCancel }) {
  // prezzo in form è stringa euro per l'input; initial.prezzo è integer centesimi dall'API
  const prezzoEuro = initial?.prezzo != null ? (initial.prezzo / 100).toFixed(2) : ''
  const [form, setForm] = useState({ descrizione: '', unita_misura: '', ...initial, prezzo: prezzoEuro })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.descrizione.trim()) { setErr('Descrizione obbligatoria'); return }
    setSaving(true)
    try {
      const prezzoVal = form.prezzo !== '' ? Math.round(parseFloat(String(form.prezzo).replace(',', '.')) * 100) : null
      await onSave({ ...form, prezzo: isNaN(prezzoVal) ? null : prezzoVal })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Errore salvataggio')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione *</label>
        <input
          type="text"
          value={form.descrizione}
          onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prezzo (€)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">€</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.prezzo}
              onChange={e => setForm(f => ({ ...f, prezzo: e.target.value }))}
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unità misura</label>
          <input
            type="text"
            value={form.unita_misura || ''}
            onChange={e => setForm(f => ({ ...f, unita_misura: e.target.value }))}
            placeholder="es. ora, cadauno"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvo…' : 'Salva'}
        </button>
      </div>
    </form>
  )
}

export default function ListiniPage() {
  const { can } = useAuth()
  const isAdmin = can('listini.manage')

  const [listini, setListini] = useState([])
  const [commitenti, setCommitenti] = useState([])
  const [filterCommitente, setFilterCommitente] = useState('')
  const [loading, setLoading] = useState(true)

  // modals
  const [newListino, setNewListino] = useState(false)
  const [editListino, setEditListino] = useState(null)
  const [deleteListino, setDeleteListino] = useState(null)
  const [selectedListino, setSelectedListino] = useState(null)
  const [newVoce, setNewVoce] = useState(false)
  const [editVoce, setEditVoce] = useState(null)
  const [deleteVoce, setDeleteVoce] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [lRes, cRes] = await Promise.all([
        listiniApi.list(filterCommitente || undefined),
        lookupApi.commitenti(),
      ])
      setListini(lRes.data)
      // commitenti ritorna oggetti {id, nome, ...} → estraiamo solo il nome
      setCommitenti(cRes.data.map(c => c.nome ?? c))
      // aggiorna selectedListino se aperto
      if (selectedListino) {
        const aggiornato = lRes.data.find(l => l.id === selectedListino.id)
        setSelectedListino(aggiornato || null)
      }
    } catch (e) {
      console.error('Errore caricamento listini:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterCommitente])

  const grouped = listini.reduce((acc, l) => {
    if (!acc[l.commitente]) acc[l.commitente] = []
    acc[l.commitente].push(l)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Listini Prezzi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestione listini per commitente</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setNewListino(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuovo listino
          </button>
        )}
      </div>

      {/* Filtro commitente */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCommitente('')}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterCommitente === '' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Tutti
        </button>
        {commitenti.map(c => (
          <button
            key={c}
            onClick={() => setFilterCommitente(c)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterCommitente === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      {loading ? (
        <p className="text-sm text-gray-400">Caricamento…</p>
      ) : listini.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Nessun listino trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([commitente, items]) => (
            <div key={commitente}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{commitente}</h2>
              <div className="space-y-2">
                {items.map(l => (
                  <div
                    key={l.id}
                    className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm ${selectedListino?.id === l.id ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'}`}
                    onClick={() => setSelectedListino(selectedListino?.id === l.id ? null : l)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{l.nome}</p>
                        {l.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.note}</p>}
                        <p className="text-xs text-gray-400 mt-1">{l.voci?.length || 0} voci</p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setEditListino(l)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Modifica"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteListino(l)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Elimina"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Voci espanse */}
                    {selectedListino?.id === l.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                        {l.voci && l.voci.length > 0 ? (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="text-left font-medium pb-1">Descrizione</th>
                                <th className="text-right font-medium pb-1">Prezzo</th>
                                <th className="text-right font-medium pb-1">U.M.</th>
                                {isAdmin && <th className="w-14"></th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {l.voci.map(v => (
                                <tr key={v.id} className="group">
                                  <td className="py-1.5 text-gray-700">{v.descrizione}</td>
                                  <td className="py-1.5 text-right text-gray-600 font-medium">
                                  {v.prezzo != null ? `€ ${(v.prezzo / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                </td>
                                  <td className="py-1.5 text-right text-gray-400">{v.unita_misura || '—'}</td>
                                  {isAdmin && (
                                    <td className="py-1.5 text-right">
                                      <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100">
                                        <button
                                          onClick={() => setEditVoce({ listino: l, voce: v })}
                                          className="p-1 text-gray-400 hover:text-blue-600"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => setDeleteVoce({ listino: l, voce: v })}
                                          className="p-1 text-gray-400 hover:text-red-600"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-xs text-gray-400 py-1">Nessuna voce</p>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setNewVoce(l)}
                            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Aggiungi voce
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuovo listino */}
      {newListino && (
        <Modal title="Nuovo listino" onClose={() => setNewListino(false)}>
          <ListinoForm
            commitenti={commitenti}
            onSave={async (data) => { await listiniApi.create(data); setNewListino(false); load() }}
            onCancel={() => setNewListino(false)}
          />
        </Modal>
      )}

      {/* Modal: Modifica listino */}
      {editListino && (
        <Modal title="Modifica listino" onClose={() => setEditListino(null)}>
          <ListinoForm
            initial={editListino}
            commitenti={commitenti}
            onSave={async (data) => { await listiniApi.update(editListino.id, data); setEditListino(null); load() }}
            onCancel={() => setEditListino(null)}
          />
        </Modal>
      )}

      {/* Modal: Conferma elimina listino */}
      {deleteListino && (
        <Modal title="Elimina listino" onClose={() => setDeleteListino(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Sei sicuro di voler eliminare <strong>{deleteListino.nome}</strong> e tutte le sue voci?
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteListino(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
            <button
              onClick={async () => { await listiniApi.delete(deleteListino.id); setDeleteListino(null); if (selectedListino?.id === deleteListino.id) setSelectedListino(null); load() }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Elimina
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Nuova voce */}
      {newVoce && (
        <Modal title="Aggiungi voce" onClose={() => setNewVoce(false)}>
          <VoceForm
            onSave={async (data) => { await listiniApi.addVoce(newVoce.id, data); setNewVoce(false); load() }}
            onCancel={() => setNewVoce(false)}
          />
        </Modal>
      )}

      {/* Modal: Modifica voce */}
      {editVoce && (
        <Modal title="Modifica voce" onClose={() => setEditVoce(null)}>
          <VoceForm
            initial={editVoce.voce}
            onSave={async (data) => { await listiniApi.updateVoce(editVoce.listino.id, editVoce.voce.id, data); setEditVoce(null); load() }}
            onCancel={() => setEditVoce(null)}
          />
        </Modal>
      )}

      {/* Modal: Conferma elimina voce */}
      {deleteVoce && (
        <Modal title="Elimina voce" onClose={() => setDeleteVoce(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Elimini la voce <strong>{deleteVoce.voce.descrizione}</strong>?
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteVoce(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
            <button
              onClick={async () => { await listiniApi.deleteVoce(deleteVoce.listino.id, deleteVoce.voce.id); setDeleteVoce(null); load() }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Elimina
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
