import { useState, useEffect } from 'react'
import { permessiApi, emailConfigApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

// ── Definizione permessi ──────────────────────────────────────────────────────

const CATEGORIE = [
  {
    label: 'Ticket',
    icon: '🎫',
    permessi: [
      { code: 'ticket.view',     label: 'Visualizzare i ticket',       desc: 'Accesso alla lista e al dettaglio dei ticket' },
      { code: 'ticket.view_all', label: 'Vedere tutti i ticket',       desc: 'Se disabilitato, il ruolo vede solo i ticket assegnati a sé stesso' },
      { code: 'ticket.create',   label: 'Creare nuovi ticket',         desc: 'Apertura di nuovi ticket di assistenza' },
      { code: 'ticket.edit',     label: 'Modificare ticket',           desc: 'Modifica di ticket esistenti (stato, dati, tecnico)' },
      { code: 'ticket.delete',   label: 'Eliminare ticket',            desc: 'Cancellazione definitiva di un ticket' },
      { code: 'ticket.close',    label: 'Concludere ticket',           desc: 'Compilazione scheda di chiusura con esito e parti sostituite' },
      { code: 'ticket.export',   label: 'Esportare in Excel',          desc: 'Download del filtro corrente in formato .xlsx' },
    ],
  },
  {
    label: 'Storico',
    icon: '📦',
    permessi: [
      { code: 'storico.view', label: 'Visualizzare lo storico', desc: 'Accesso ai ticket chiusi e annullati' },
    ],
  },
  {
    label: 'Anagrafiche',
    icon: '🏢',
    permessi: [
      { code: 'anagrafiche.view',   label: 'Visualizzare anagrafiche',  desc: 'Lettura dei dati dei clienti/commitenti' },
      { code: 'anagrafiche.create', label: 'Creare anagrafiche',        desc: 'Inserimento di nuove anagrafiche' },
      { code: 'anagrafiche.edit',   label: 'Modificare anagrafiche',    desc: 'Aggiornamento dati anagrafici' },
      { code: 'anagrafiche.delete', label: 'Eliminare anagrafiche',     desc: 'Cancellazione definitiva di un\'anagrafica' },
    ],
  },
  {
    label: 'Listini Prezzi',
    icon: '💰',
    permessi: [
      { code: 'listini.view',   label: 'Visualizzare listini', desc: 'Lettura di listini e voci prezzo' },
      { code: 'listini.manage', label: 'Gestire listini',      desc: 'Creazione, modifica ed eliminazione di listini e voci' },
    ],
  },
  {
    label: 'Magazzino',
    icon: '🏭',
    permessi: [
      { code: 'magazzino.view',           label: 'Visualizzare il magazzino', desc: 'Accesso alla pagina magazzino, giacenze e movimenti' },
      { code: 'magazzino.articoli.view',  label: 'Visualizzare articoli',     desc: 'Lettura schede articolo, dettagli e giacenze' },
      { code: 'magazzino.articoli.edit',  label: 'Modificare articoli',       desc: 'Aggiunta e modifica di articoli a magazzino' },
      { code: 'magazzino.articoli.delete',label: 'Eliminare articoli',        desc: 'Eliminazione definitiva di articoli dal magazzino' },
      { code: 'magazzino.movimenti',      label: 'Registrare movimenti',      desc: 'Entrate, uscite e rettifiche di magazzino' },
    ],
  },
  {
    label: 'Statistiche',
    icon: '📊',
    permessi: [
      { code: 'stats.view', label: 'Visualizzare statistiche', desc: 'Dashboard KPI, grafici e report SLA' },
    ],
  },
  {
    label: 'Utenti',
    icon: '👥',
    permessi: [
      { code: 'utenti.view',   label: 'Visualizzare utenti', desc: 'Lista degli utenti dell\'organizzazione' },
      { code: 'utenti.manage', label: 'Gestire utenti',      desc: 'Creazione, modifica, attivazione/disattivazione utenti' },
    ],
  },
  {
    label: 'Clienti Diretti',
    icon: '👤',
    permessi: [
      { code: 'clienti.view',   label: 'Visualizzare clienti diretti', desc: 'Accesso alla lista dei clienti diretti' },
      { code: 'clienti.create', label: 'Creare clienti diretti',       desc: 'Inserimento di nuovi clienti diretti' },
      { code: 'clienti.edit',   label: 'Modificare clienti diretti',   desc: 'Aggiornamento dati dei clienti diretti' },
      { code: 'clienti.delete', label: 'Eliminare clienti diretti',    desc: 'Cancellazione definitiva di un cliente diretto' },
    ],
  },
  {
    label: 'Catalogo Servizi',
    icon: '📦',
    permessi: [
      { code: 'servizi.view',   label: 'Visualizzare catalogo servizi', desc: 'Lettura di prodotti e servizi del catalogo' },
      { code: 'servizi.manage', label: 'Gestire catalogo servizi',      desc: 'Creazione, modifica ed eliminazione di servizi e prodotti' },
    ],
  },
  {
    label: 'Abbonamenti',
    icon: '🔄',
    permessi: [
      { code: 'abbonamenti.view',   label: 'Visualizzare abbonamenti', desc: 'Accesso ai contratti e alle scadenze abbonamenti' },
      { code: 'abbonamenti.manage', label: 'Gestire abbonamenti',      desc: 'Creazione, modifica ed eliminazione di contratti abbonamento' },
    ],
  },
  {
    label: 'Funnel Vendite',
    icon: '🔽',
    permessi: [
      { code: 'funnel.view',   label: 'Visualizzare funnel vendite', desc: 'Accesso alla pipeline commerciale e alle opportunità' },
      { code: 'funnel.manage', label: 'Gestire funnel vendite',      desc: 'Creazione, modifica e spostamento delle opportunità nel funnel' },
    ],
  },
]

const RUOLI = [
  { value: 'amministratore', label: 'Amministratore', color: 'blue',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200' },
  { value: 'commerciale',    label: 'Commerciale',    color: 'green',  bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-200' },
  { value: 'tecnico',        label: 'Tecnico',        color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
]

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled, size = 'md' }) {
  const h = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
  const dot = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const tx = size === 'sm' ? (value ? 'translate-x-5' : 'translate-x-1') : (value ? 'translate-x-6' : 'translate-x-1')
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      aria-checked={value}
      role="switch"
      className={`relative inline-flex ${h} shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${value ? 'bg-blue-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
      `}
    >
      <span
        className={`inline-block ${dot} rounded-full bg-white shadow transform transition-transform ${tx}`}
      />
    </button>
  )
}

// ── Sezione notifiche email ────────────────────────────────────────────────────

const GRUPPI_EVENTO = ['Ticket', 'SLA', 'Abbonamenti', 'Funnel']

const GRUPPO_COLORS = {
  Ticket:      { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700' },
  SLA:         { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700' },
  Abbonamenti: { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700' },
  Funnel:      { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700' },
}

function NotificheSection() {
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
  const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"

  const [smtp, setSmtp] = useState(null)
  const [eventi, setEventi] = useState([])
  const [loadingSmtp, setLoadingSmtp] = useState(true)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [savingEventi, setSavingEventi] = useState(false)
  const [smtpMsg, setSmtpMsg] = useState(null)   // {type:'ok'|'err', text}
  const [eventiMsg, setEventiMsg] = useState(null)
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testMsg, setTestMsg] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordDirty, setPasswordDirty] = useState(false)

  useEffect(() => {
    Promise.all([emailConfigApi.getSmtp(), emailConfigApi.getNotifiche()])
      .then(([s, n]) => {
        setSmtp({ ...s.data, password: '' })
        setEventi(n.data.eventi)
      })
      .finally(() => setLoadingSmtp(false))
  }, [])

  const handleSmtpSave = async (e) => {
    e.preventDefault()
    setSavingSmtp(true)
    setSmtpMsg(null)
    try {
      const payload = { ...smtp }
      if (!passwordDirty) delete payload.password
      await emailConfigApi.updateSmtp(payload)
      setSmtpMsg({ type: 'ok', text: 'Configurazione SMTP salvata.' })
      setPasswordDirty(false)
    } catch (err) {
      setSmtpMsg({ type: 'err', text: err.response?.data?.detail || 'Errore nel salvataggio.' })
    } finally {
      setSavingSmtp(false)
    }
  }

  const handleEventiSave = async () => {
    setSavingEventi(true)
    setEventiMsg(null)
    try {
      await emailConfigApi.updateNotifiche(eventi.map(e => ({ key: e.key, abilitato: e.abilitato, destinatari: e.destinatari })))
      setEventiMsg({ type: 'ok', text: 'Configurazione notifiche salvata.' })
    } catch (err) {
      setEventiMsg({ type: 'err', text: err.response?.data?.detail || 'Errore nel salvataggio.' })
    } finally {
      setSavingEventi(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) return
    setTestLoading(true)
    setTestMsg(null)
    try {
      const res = await emailConfigApi.testEmail(testEmail)
      setTestMsg({ type: 'ok', text: res.data.message })
    } catch (err) {
      setTestMsg({ type: 'err', text: err.response?.data?.detail || 'Errore durante il test.' })
    } finally {
      setTestLoading(false)
    }
  }

  const toggleEvento = (key) => {
    setEventi(prev => prev.map(e => e.key === key ? { ...e, abilitato: !e.abilitato } : e))
  }

  const setDestinatari = (key, val) => {
    setEventi(prev => prev.map(e => e.key === key ? { ...e, destinatari: val } : e))
  }

  if (loadingSmtp) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Caricamento...
      </div>
    )
  }

  const Msg = ({ m }) => m ? (
    <p className={`text-sm px-4 py-2.5 rounded-xl border ${
      m.type === 'ok'
        ? 'bg-green-50 text-green-700 border-green-100'
        : 'bg-red-50 text-red-600 border-red-100'
    }`}>
      {m.type === 'ok' ? '✓ ' : '✗ '}{m.text}
    </p>
  ) : null

  return (
    <div className="space-y-6">

      {/* ── Configurazione SMTP ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Server SMTP</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configura il server di posta per l'invio delle notifiche</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-gray-500">{smtp?.enabled ? 'Attivo' : 'Disattivato'}</span>
            <Toggle value={smtp?.enabled || false} onChange={() => setSmtp(s => ({ ...s, enabled: !s.enabled }))} />
          </div>
        </div>

        <form onSubmit={handleSmtpSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Host SMTP</label>
              <input className={inputCls} placeholder="smtp.gmail.com"
                value={smtp?.host || ''} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Porta</label>
              <input className={inputCls} type="number" placeholder="587"
                value={smtp?.port || 587} onChange={e => setSmtp(s => ({ ...s, port: parseInt(e.target.value) || 587 }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} placeholder="utente@esempio.com"
                value={smtp?.username || ''} onChange={e => setSmtp(s => ({ ...s, username: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  className={inputCls + ' pr-10'}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={smtp?.has_password ? '••••••••' : 'Inserisci password'}
                  value={smtp?.password || ''}
                  onChange={e => { setSmtp(s => ({ ...s, password: e.target.value })); setPasswordDirty(true) }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Indirizzo mittente</label>
              <input className={inputCls} type="email" placeholder="notifiche@esempio.com"
                value={smtp?.from_email || ''} onChange={e => setSmtp(s => ({ ...s, from_email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Nome mittente</label>
              <input className={inputCls} placeholder="Morpheus HUB"
                value={smtp?.from_name || ''} onChange={e => setSmtp(s => ({ ...s, from_name: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <Toggle size="sm" value={smtp?.use_tls || false} onChange={() => setSmtp(s => ({ ...s, use_tls: !s.use_tls, use_ssl: false }))} />
              <span className="text-sm text-gray-700">STARTTLS</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <Toggle size="sm" value={smtp?.use_ssl || false} onChange={() => setSmtp(s => ({ ...s, use_ssl: !s.use_ssl, use_tls: false }))} />
              <span className="text-sm text-gray-700">SSL/TLS diretto</span>
            </label>
            <p className="text-xs text-gray-400 ml-auto">STARTTLS: porta 587 · SSL: porta 465</p>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <Msg m={smtpMsg} />
            <button type="submit" disabled={savingSmtp}
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {savingSmtp ? 'Salvataggio...' : 'Salva SMTP'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Email di test ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Email di test</h2>
        <p className="text-xs text-gray-400 mb-4">Verifica che il server SMTP sia configurato correttamente inviando un'email di prova</p>
        <div className="flex gap-3">
          <input className={inputCls + ' flex-1'} type="email" placeholder="destinatario@esempio.com"
            value={testEmail} onChange={e => setTestEmail(e.target.value)} />
          <button onClick={handleTest} disabled={testLoading || !testEmail}
            className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center gap-2 shrink-0">
            {testLoading
              ? <><svg className="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Invio...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Invia test</>
            }
          </button>
        </div>
        {testMsg && <Msg m={testMsg} />}
      </div>

      {/* ── Toggle notifiche ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Notifiche email</h2>
            <p className="text-xs text-gray-400 mt-0.5">Scegli quali eventi generano una email e a chi inviarla</p>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {GRUPPI_EVENTO.map(gruppo => {
            const gruppoEventi = eventi.filter(e => e.gruppo === gruppo)
            if (!gruppoEventi.length) return null
            const col = GRUPPO_COLORS[gruppo] || { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600' }
            return (
              <div key={gruppo}>
                <div className="px-6 py-2.5 bg-gray-50/60 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{gruppo}</span>
                </div>
                {gruppoEventi.map(ev => (
                  <div key={ev.key} className="grid grid-cols-[auto_1fr_280px] gap-4 items-center px-6 py-4 hover:bg-blue-50/20 transition-colors border-t border-gray-50 first:border-0">
                    <Toggle value={ev.abilitato} onChange={() => toggleEvento(ev.key)} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{ev.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{ev.desc}</div>
                    </div>
                    <div>
                      <input
                        className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-opacity ${
                          ev.abilitato ? 'border-gray-200 text-gray-700' : 'border-gray-100 text-gray-300 opacity-50'
                        }`}
                        disabled={!ev.abilitato}
                        placeholder="email1@ex.com, email2@ex.com"
                        value={ev.destinatari || ''}
                        onChange={e => setDestinatari(ev.key, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50/40">
          <p className="text-xs text-gray-400">Inserisci i destinatari come indirizzi email separati da virgola</p>
          <Msg m={eventiMsg} />
          <button onClick={handleEventiSave} disabled={savingEventi}
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0">
            {savingEventi ? 'Salvataggio...' : 'Salva notifiche'}
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AmministrazionePage() {
  const { refreshPermissions, user } = useAuth()
  const [activeTab, setActiveTab] = useState('permessi')
  const [matrice, setMatrice] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [modified, setModified] = useState(false)

  useEffect(() => {
    Promise.all([permessiApi.matrice(), permessiApi.default()])
      .then(([mRes, dRes]) => {
        setMatrice(mRes.data)
        setDefaults(dRes.data)
      })
      .catch(() => setError('Impossibile caricare i permessi'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (ruolo, code) => {
    setMatrice(prev => ({
      ...prev,
      [ruolo]: { ...prev[ruolo], [code]: !prev[ruolo][code] },
    }))
    setModified(true)
    setSuccess('')
  }

  const handleReset = () => {
    if (!defaults) return
    setMatrice(JSON.parse(JSON.stringify(defaults)))
    setModified(true)
    setSuccess('')
    setError('')
  }

  const handleSalva = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await permessiApi.updateMatrice(matrice)
      setMatrice(res.data)
      setModified(false)
      setSuccess('Permessi salvati con successo')
      await refreshPermissions()
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  // Imposta tutti i toggle di un ruolo in blocco
  const setAll = (ruolo, value) => {
    setMatrice(prev => {
      const updated = { ...prev[ruolo] }
      Object.keys(updated).forEach(k => { updated[k] = value })
      return { ...prev, [ruolo]: updated }
    })
    setModified(true)
  }

  if (loading && activeTab === 'permessi') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Amministrazione</h1>
          </div>
        </div>
        <div className="flex border-b border-gray-200 mb-6">
          {[{ k: 'permessi', l: 'Permessi', icon: '🔐' }, { k: 'notifiche', l: 'Notifiche Email', icon: '✉️' }].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)}
              className={`flex items-center gap-1.5 px-1 pb-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === t.k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}><span>{t.icon}</span>{t.l}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Caricamento permessi...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Amministrazione</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci permessi, configurazione email e notifiche dell'organizzazione.
          </p>
        </div>
        {activeTab === 'permessi' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ripristina default
            </button>
            <button
              onClick={handleSalva}
              disabled={saving || !modified}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { k: 'permessi',  l: 'Permessi',        icon: '🔐' },
          { k: 'notifiche', l: 'Notifiche Email',  icon: '✉️' },
        ].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            className={`flex items-center gap-1.5 px-1 pb-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === t.k
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            <span>{t.icon}</span>{t.l}
          </button>
        ))}
      </div>

      {activeTab === 'permessi' && <>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-4">✓ {success}</p>}

        {/* Nota proprietario */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
          <span className="text-purple-500 mt-0.5">ℹ</span>
          <p className="text-sm text-purple-700">
            Il ruolo <strong>Proprietario</strong> ha sempre accesso completo a tutte le funzionalità e non può essere limitato.
          </p>
        </div>
      </>}

      {activeTab === 'notifiche' && <NotificheSection />}

      {activeTab === 'permessi' && <>
      {/* Tabella permessi */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header tabella */}
        <div className="grid grid-cols-[1fr_repeat(3,140px)] border-b border-gray-200 bg-gray-50">
          <div className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Permesso
          </div>
          {RUOLI.map(r => (
            <div key={r.value} className={`px-3 py-3 text-center border-l border-gray-200`}>
              <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${r.bg} ${r.text}`}>
                {r.label}
              </span>
              <div className="flex justify-center gap-2 mt-2">
                <button
                  onClick={() => setAll(r.value, true)}
                  className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                  title="Abilita tutti"
                >Tutti</button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => setAll(r.value, false)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                  title="Disabilita tutti"
                >Nessuno</button>
              </div>
            </div>
          ))}
        </div>

        {/* Righe permessi per categoria */}
        {CATEGORIE.map((cat, ci) => (
          <div key={cat.label} className={ci > 0 ? 'border-t border-gray-100' : ''}>
            {/* Header categoria */}
            <div className="grid grid-cols-[1fr_repeat(3,140px)] bg-gray-50/60">
              <div className="px-5 py-2 flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{cat.label}</span>
              </div>
              {RUOLI.map(r => (
                <div key={r.value} className="border-l border-gray-100" />
              ))}
            </div>

            {/* Righe singoli permessi */}
            {cat.permessi.map((perm, pi) => (
              <div
                key={perm.code}
                className={`grid grid-cols-[1fr_repeat(3,140px)] hover:bg-blue-50/30 transition-colors
                  ${pi < cat.permessi.length - 1 ? 'border-b border-gray-50' : ''}
                `}
              >
                <div className="px-5 py-3 flex flex-col justify-center">
                  <span className="text-sm font-medium text-gray-800">{perm.label}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{perm.desc}</span>
                </div>
                {RUOLI.map(r => (
                  <div key={r.value} className="border-l border-gray-100 flex items-center justify-center py-3">
                    {matrice?.[r.value] !== undefined ? (
                      <Toggle
                        value={matrice[r.value][perm.code] ?? false}
                        onChange={() => toggle(r.value, perm.code)}
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Ruoli</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { ruolo: 'Amministratore', desc: 'Gestione completa dell\'organizzazione, utenti e configurazioni' },
            { ruolo: 'Commerciale',    desc: 'Gestione ticket, anagrafiche e listini. No eliminazioni critiche' },
            { ruolo: 'Tecnico',        desc: 'Operatività sul campo: ticket, chiusure e movimenti magazzino' },
          ].map(r => (
            <div key={r.ruolo}>
              <div className="text-sm font-medium text-gray-700">{r.ruolo}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
      </>}

    </div>
  )
}
