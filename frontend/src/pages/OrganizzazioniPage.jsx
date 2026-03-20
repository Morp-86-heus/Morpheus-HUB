import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { organizzazioniApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

// ── LicenzaBadge ─────────────────────────────────────────────────────────────

function LicenzaBadge({ org }) {
  const stato = org.stato_licenza || 'nessuna'

  const cfg = {
    nessuna:       { label: 'Nessuna licenza',  cls: 'bg-gray-100 text-gray-500' },
    trial:         { label: 'Trial',            cls: 'bg-yellow-100 text-yellow-700' },
    trial_scaduto: { label: 'Trial scaduto',    cls: 'bg-red-100 text-red-600' },
    attiva:        { label: org.piano ? (org.piano.charAt(0).toUpperCase() + org.piano.slice(1)) : 'Attiva', cls: 'bg-green-100 text-green-700' },
    scaduta:       { label: 'Scaduta',          cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = cfg[stato] || cfg.nessuna

  let extra = ''
  if (stato === 'trial') {
    const d = daysUntil(org.trial_scadenza)
    if (d !== null) extra = d > 0 ? ` · ${d}gg` : ' · scade oggi'
  } else if (stato === 'attiva' && org.licenza_scadenza) {
    const d = daysUntil(org.licenza_scadenza)
    if (d !== null && d <= 30) extra = d > 0 ? ` · ${d}gg` : ' · scade oggi'
  }

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {label}{extra}
    </span>
  )
}

// ── LicenzaModal ─────────────────────────────────────────────────────────────

const PIANI = [
  { value: 'base',         label: 'Base' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise',   label: 'Enterprise' },
]

function LicenzaModal({ org, onClose, onUpdate }) {
  const stato = org.stato_licenza || 'nessuna'
  const [trialGiorni, setTrialGiorni] = useState(30)
  const [piano, setPiano] = useState(
    org.piano && org.piano !== 'trial' ? org.piano : 'base'
  )
  const [scadenza, setScadenza] = useState(
    org.licenza_scadenza ? org.licenza_scadenza.substring(0, 10) : ''
  )
  const [note, setNote] = useState(org.note_licenza || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const wrap = async (fn) => {
    setLoading(true); setError(''); setSuccess('')
    try {
      await fn()
      setSuccess('Operazione completata')
      onUpdate()
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore durante l\'operazione')
    } finally {
      setLoading(false)
    }
  }

  const handleAttivaTrial = () =>
    wrap(() => organizzazioniApi.attivaTrial(org.id, { durata_giorni: trialGiorni }))

  const handleAttivaLicenza = () =>
    wrap(() => organizzazioniApi.attivaLicenza(org.id, {
      piano,
      licenza_scadenza: scadenza ? new Date(scadenza).toISOString() : null,
      note_licenza: note || null,
    }))

  const handleDisattiva = () =>
    wrap(() => organizzazioniApi.disattivaLicenza(org.id))

  const handleSalvaNota = () =>
    wrap(() => organizzazioniApi.aggiornaLicenza(org.id, {
      piano: piano !== 'trial' ? piano : undefined,
      licenza_scadenza: scadenza ? new Date(scadenza).toISOString() : null,
      note_licenza: note || null,
    }))

  const canTrial = !org.licenza_attiva
  const isActive = stato === 'attiva'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gestione Licenza</h2>
            <p className="text-sm text-gray-500 mt-0.5">{org.nome}</p>
          </div>
          <LicenzaBadge org={org} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</p>}

        <hr className="border-gray-100" />

        {/* Trial */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-bold">T</span>
            Trial
          </h3>
          {stato === 'trial' && org.trial_scadenza && (
            <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mb-3">
              Trial attivo — scade il {new Date(org.trial_scadenza).toLocaleDateString('it-IT')}
              {daysUntil(org.trial_scadenza) !== null && ` (${daysUntil(org.trial_scadenza)} giorni)`}
            </p>
          )}
          {stato === 'trial_scaduto' && (
            <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
              Trial scaduto il {new Date(org.trial_scadenza).toLocaleDateString('it-IT')}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Durata (giorni)</label>
              <div className="flex gap-2">
                {[14, 30, 60, 90].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrialGiorni(d)}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${trialGiorni === d ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {d}gg
                  </button>
                ))}
                <input
                  type="number"
                  value={trialGiorni}
                  onChange={e => setTrialGiorni(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="w-16 border border-gray-300 rounded-md px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
              </div>
            </div>
            <button
              onClick={handleAttivaTrial}
              disabled={loading || !canTrial}
              className="mt-4 px-3 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {stato === 'trial' || stato === 'trial_scaduto' ? 'Rinnova Trial' : 'Attiva Trial'}
            </button>
          </div>
          {!canTrial && (
            <p className="text-xs text-gray-400 mt-1">Il trial non è disponibile quando la licenza è attiva.</p>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Licenza */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">L</span>
            Licenza
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Piano</label>
              <select
                value={piano}
                onChange={e => setPiano(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PIANI.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scadenza (vuoto = perpetua)</label>
              <input
                type="date"
                value={scadenza}
                onChange={e => setScadenza(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAttivaLicenza}
              disabled={loading}
              className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {isActive ? 'Aggiorna Licenza' : 'Attiva Licenza'}
            </button>
            {isActive && (
              <button
                onClick={handleDisattiva}
                disabled={loading}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
              >
                Disattiva
              </button>
            )}
          </div>

          {stato === 'scaduta' && (
            <p className="text-xs text-red-600 mt-2">
              Licenza scaduta il {new Date(org.licenza_scadenza).toLocaleDateString('it-IT')}. Usa "Aggiorna Licenza" per rinnovarla.
            </p>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Note interne sulla licenza (non visibili all'organizzazione)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleSalvaNota}
            disabled={loading}
            className="mt-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Salva note
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-gray-800' }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

// ── OrgCard ───────────────────────────────────────────────────────────────────

function OrgCard({ org, stats, onGestisci, onEdit, onDelete, onGestisciLicenza }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-4 ${!org.attivo ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base truncate">{org.nome}</h3>
            {!org.attivo && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Disattiva</span>
            )}
          </div>
          <div className="mt-1.5">
            <LicenzaBadge org={org} />
          </div>
          {org.descrizione && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{org.descrizione}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onGestisciLicenza(org)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Gestisci licenza"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(org)}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifica"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(org)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Elimina"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100">
          <StatCard label="Ticket totali" value={stats.totale_ticket} />
          <StatCard label="Ticket aperti" value={stats.ticket_aperti} color={stats.ticket_aperti > 0 ? 'text-orange-600' : 'text-gray-800'} />
          <StatCard label="Utenti" value={stats.totale_utenti} />
        </div>
      ) : (
        <div className="py-3 border-y border-gray-100 flex justify-center">
          <div className="text-xs text-gray-400">Caricamento statistiche...</div>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          to={`/organizzazioni/${org.id}/anagrafica`}
          className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Anagrafica
        </Link>
        <button
          onClick={() => onGestisci(org)}
          className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Gestisci
        </button>
      </div>
    </div>
  )
}

// ── OrgFormModal ──────────────────────────────────────────────────────────────

function OrgFormModal({ org, onClose, onSave }) {
  const [nome, setNome] = useState(org?.nome || '')
  const [descrizione, setDescrizione] = useState(org?.descrizione || '')
  const [attivo, setAttivo] = useState(org?.attivo ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true)
    setError('')
    try {
      let result
      if (org?.id) {
        const res = await organizzazioniApi.update(org.id, { nome: nome.trim(), descrizione: descrizione.trim() || null, attivo })
        result = res.data
      } else {
        const res = await organizzazioniApi.create({ nome: nome.trim(), descrizione: descrizione.trim() || null })
        result = res.data
      }
      onSave(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {org?.id ? 'Modifica organizzazione' : 'Nuova organizzazione'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome organizzazione"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Descrizione opzionale"
            />
          </div>
          {org?.id && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attivo}
                onChange={e => setAttivo(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Organizzazione attiva</span>
            </label>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrganizzazioniPage() {
  const { setActiveOrg } = useAuth()
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOrg, setModalOrg] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [licenzaOrg, setLicenzaOrg] = useState(null)  // org per cui aprire LicenzaModal

  const loadOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await organizzazioniApi.list()
      setOrgs(res.data)
      const statsResults = await Promise.allSettled(res.data.map(o => organizzazioniApi.stats(o.id)))
      const statsMap = {}
      statsResults.forEach((r, i) => {
        if (r.status === 'fulfilled') statsMap[res.data[i].id] = r.value.data
      })
      setStats(statsMap)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  const handleGestisci = (org) => { setActiveOrg(org); navigate('/') }
  const handleEdit = (org) => { setModalOrg(org); setShowModal(true) }
  const handleNew = () => { setModalOrg({}); setShowModal(true) }
  const handleSave = () => { setShowModal(false); setModalOrg(null); loadOrgs() }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleteError('')
    try {
      await organizzazioniApi.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      loadOrgs()
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Impossibile eliminare')
    }
  }

  // Quando la licenza viene aggiornata, ricarica le org e aggiorna l'org nel modal
  const handleLicenzaUpdate = async () => {
    const res = await organizzazioniApi.list()
    setOrgs(res.data)
    if (licenzaOrg) {
      const updated = res.data.find(o => o.id === licenzaOrg.id)
      if (updated) setLicenzaOrg(updated)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🏢</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Console Proprietario</h1>
              <p className="text-sm text-gray-500">Gestione organizzazioni</p>
            </div>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuova organizzazione
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            Caricamento organizzazioni...
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Nessuna organizzazione</h2>
            <p className="text-gray-500 mb-6">Crea la prima organizzazione per iniziare</p>
            <button
              onClick={handleNew}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crea organizzazione
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {orgs.length} {orgs.length === 1 ? 'organizzazione' : 'organizzazioni'} configurate
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {orgs.map(org => (
                <OrgCard
                  key={org.id}
                  org={org}
                  stats={stats[org.id]}
                  onGestisci={handleGestisci}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirm}
                  onGestisciLicenza={setLicenzaOrg}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal crea/modifica */}
      {showModal && (
        <OrgFormModal
          org={modalOrg}
          onClose={() => { setShowModal(false); setModalOrg(null) }}
          onSave={handleSave}
        />
      )}

      {/* Modal licenza */}
      {licenzaOrg && (
        <LicenzaModal
          org={licenzaOrg}
          onClose={() => setLicenzaOrg(null)}
          onUpdate={handleLicenzaUpdate}
        />
      )}

      {/* Modal conferma eliminazione */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Elimina organizzazione</h2>
            <p className="text-sm text-gray-600 mb-4">
              Sei sicuro di voler eliminare <strong>{deleteConfirm.nome}</strong>?
              Questa azione non può essere annullata.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError('') }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
