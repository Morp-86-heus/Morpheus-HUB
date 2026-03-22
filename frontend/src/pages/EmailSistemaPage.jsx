import { useState, useEffect } from 'react'
import { emailConfigApi } from '../api/client'

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      aria-checked={value}
      role="switch"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none
        ${value ? 'bg-blue-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
const labelCls = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5"

export default function EmailSistemaPage() {
  const [smtp, setSmtp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)   // {type:'ok'|'err', text}
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testMsg, setTestMsg] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordDirty, setPasswordDirty] = useState(false)

  useEffect(() => {
    emailConfigApi.getSystemSmtp()
      .then(r => setSmtp({ ...r.data, password: '' }))
      .catch(() => setMsg({ type: 'err', text: 'Errore nel caricamento della configurazione.' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const payload = { ...smtp }
      if (!passwordDirty) delete payload.password
      await emailConfigApi.updateSystemSmtp(payload)
      setMsg({ type: 'ok', text: 'Configurazione SMTP di sistema salvata.' })
      setPasswordDirty(false)
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.detail || 'Errore nel salvataggio.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) return
    setTestLoading(true)
    setTestMsg(null)
    try {
      const r = await emailConfigApi.testSystemEmail(testEmail)
      setTestMsg({ type: 'ok', text: r.data.message || 'Email inviata correttamente.' })
    } catch (err) {
      setTestMsg({ type: 'err', text: err.response?.data?.detail || 'Errore nell\'invio.' })
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Caricamento...</div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email di sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura il server SMTP utilizzato per l'invio delle email di sistema, incluso il recupero password per tutti gli account.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Toggle abilitazione */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Notifiche email abilitate</p>
            <p className="text-xs text-gray-400 mt-0.5">Attiva per abilitare l'invio di email dal sistema</p>
          </div>
          <Toggle value={smtp?.enabled || false} onChange={() => setSmtp(s => ({ ...s, enabled: !s.enabled }))} />
        </div>

        <hr className="border-gray-100" />

        {/* Server SMTP */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Server SMTP</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Host</label>
              <input className={inputCls} placeholder="smtp.esempio.it" value={smtp?.host || ''}
                onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Porta</label>
              <input className={inputCls} type="number" placeholder="587" value={smtp?.port || 587}
                onChange={e => setSmtp(s => ({ ...s, port: parseInt(e.target.value) || 587 }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} placeholder="user@esempio.it" value={smtp?.username || ''}
                onChange={e => setSmtp(s => ({ ...s, username: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  className={inputCls + ' pr-10'}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={smtp?.has_password ? '••••••••' : 'Non impostata'}
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

          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                checked={smtp?.use_tls || false}
                onChange={e => setSmtp(s => ({ ...s, use_tls: e.target.checked }))} />
              <span className="text-sm text-gray-700">STARTTLS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                checked={smtp?.use_ssl || false}
                onChange={e => setSmtp(s => ({ ...s, use_ssl: e.target.checked }))} />
              <span className="text-sm text-gray-700">SSL/TLS</span>
            </label>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Mittente */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Mittente</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Indirizzo mittente</label>
              <input className={inputCls} type="email" placeholder="noreply@esempio.it" value={smtp?.from_email || ''}
                onChange={e => setSmtp(s => ({ ...s, from_email: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Nome mittente</label>
              <input className={inputCls} placeholder="Morpheus HUB" value={smtp?.from_name || ''}
                onChange={e => setSmtp(s => ({ ...s, from_name: e.target.value }))} />
            </div>
          </div>
        </div>

        {msg && (
          <div className={`text-sm px-4 py-3 rounded-xl flex items-center gap-2 ${msg.type === 'ok' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-600'}`}>
            {msg.type === 'ok'
              ? <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              : <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            }
            {msg.text}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Salvataggio...' : 'Salva configurazione'}
          </button>
        </div>
      </form>

      {/* Test email */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-800 mb-1">Test invio email</p>
        <p className="text-xs text-gray-400 mb-4">Invia un'email di prova per verificare che la configurazione funzioni.</p>
        <div className="flex gap-3">
          <input
            className={inputCls + ' flex-1'}
            type="email"
            placeholder="destinatario@esempio.it"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testLoading || !testEmail}
            className="px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-900 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {testLoading ? 'Invio...' : 'Invia test'}
          </button>
        </div>
        {testMsg && (
          <p className={`text-xs mt-2 ${testMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{testMsg.text}</p>
        )}
      </div>
    </div>
  )
}
