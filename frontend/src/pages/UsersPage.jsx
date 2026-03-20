import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const PASSWORD_RULES = [
  { label: "Almeno 8 caratteri",          test: (p) => p.length >= 8 },
  { label: "Almeno una maiuscola",         test: (p) => /[A-Z]/.test(p) },
  { label: "Almeno un numero",             test: (p) => /[0-9]/.test(p) },
  { label: "Almeno un carattere speciale", test: (p) => /[^A-Za-z0-9]/.test(p) },
]
const isPasswordValid = (p) => PASSWORD_RULES.every(r => r.test(p))

const RUOLI = ['proprietario', 'amministratore', 'commerciale', 'tecnico']
const RUOLO_COLORS = {
  proprietario: 'bg-purple-100 text-purple-700',
  amministratore: 'bg-blue-100 text-blue-700',
  commerciale: 'bg-green-100 text-green-700',
  tecnico: 'bg-orange-100 text-orange-700',
}

const emptyForm = { email: '', nome: '', cognome: '', telefono: '', password: '', ruolo: 'tecnico' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)   // user id in edit
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => axios.get('/api/auth/users').then(r => setUsers(r.data))
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    if (form.password && !isPasswordValid(form.password)) {
      setError("La password non rispetta i requisiti di sicurezza")
      setSaving(false)
      return
    }
    if (!editing && !isPasswordValid(form.password)) {
      setError("La password non rispetta i requisiti di sicurezza")
      setSaving(false)
      return
    }
    try {
      if (editing) {
        const payload = {
          email: form.email,
          nome: form.nome,
          cognome: form.cognome,
          telefono: form.telefono || null,
          ruolo: form.ruolo,
        }
        if (form.password) payload.password = form.password
        await axios.put(`/api/auth/users/${editing}`, payload)
      } else {
        await axios.post('/api/auth/users', form)
      }
      setForm(emptyForm)
      setEditing(null)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo utente?')) return
    await axios.delete(`/api/auth/users/${id}`)
    load()
  }

  const startEdit = (u) => {
    setEditing(u.id)
    setForm({
      email: u.email,
      nome: u.nome,
      cognome: u.cognome || '',
      telefono: u.telefono || '',
      password: '',
      ruolo: u.ruolo,
    })
  }

  const toggleAttivo = async (u) => {
    await axios.put(`/api/auth/users/${u.id}`, { attivo: !u.attivo })
    load()
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestione Utenti</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-5">
            {editing ? 'Modifica utente' : 'Nuovo utente'}
          </h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome *</label>
                <input className={inputCls} value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Mario" />
              </div>
              <div>
                <label className={labelCls}>Cognome</label>
                <input className={inputCls} value={form.cognome} onChange={e => set('cognome', e.target.value)} placeholder="Rossi" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Email (username) *</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                placeholder="mario.rossi@azienda.it"
              />
            </div>

            <div>
              <label className={labelCls}>Telefono</label>
              <input
                type="tel"
                className={inputCls}
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="+39 333 1234567"
              />
            </div>

            <div>
              <label className={labelCls}>
                Password {editing && <span className="text-gray-400 normal-case font-normal">(lascia vuoto per non cambiare)</span>}
              </label>
              <input
                type="password"
                className={inputCls}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required={!editing}
                placeholder="••••••••"
              />
              {form.password && (
                <ul className="mt-1.5 space-y-0.5">
                  {PASSWORD_RULES.map(r => (
                    <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(form.password) ? "text-green-600" : "text-gray-400"}`}>
                      <span>{r.test(form.password) ? "✓" : "○"}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className={labelCls}>Ruolo</label>
              <select className={inputCls} value={form.ruolo} onChange={e => set('ruolo', e.target.value)}>
                {RUOLI.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{error}</div>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Salvataggio...' : editing ? 'Aggiorna' : 'Crea'}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm(emptyForm) }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
                  Annulla
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabella utenti */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                {['Nome', 'Email', 'Telefono', 'Ruolo', 'Stato', 'Azioni'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {u.nome_completo}
                      {u.id === me?.id && <span className="ml-1 text-xs text-blue-400">(tu)</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{u.telefono || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${RUOLO_COLORS[u.ruolo] || ''}`}>
                      {u.ruolo}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => u.id !== me?.id && toggleAttivo(u)}
                      disabled={u.id === me?.id}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${u.attivo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'} disabled:opacity-40`}
                    >
                      {u.attivo ? 'Attivo' : 'Disabilitato'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(u)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        Modifica
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => handleDelete(u.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                          Elimina
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
