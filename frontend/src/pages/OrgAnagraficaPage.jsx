import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { organizzazioniApi } from '../api/client'

const TABS = [
  { key: 'generale',     label: 'Generale' },
  { key: 'sede',         label: 'Sede legale' },
  { key: 'contatti',     label: 'Contatti' },
  { key: 'referente',    label: 'Referente' },
  { key: 'fatturazione', label: 'Fatturazione' },
]

const REGIMI = [
  'Ordinario',
  'Forfettario',
  'Minimi',
  'Regime speciale agricoltura',
  'Enti non commerciali',
]

// ── Componenti display / edit ─────────────────────────────────────────────────

function Row({ label, value, children, editing }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 last:border-0 items-start">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="col-span-2">
        {editing
          ? children
          : <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
              {value || '—'}
            </span>
        }
      </div>
    </div>
  )
}

function Input({ value, onChange, placeholder, maxLength, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="">{placeholder || 'Seleziona...'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TextareaInput({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  )
}

// ── Sezioni ───────────────────────────────────────────────────────────────────

function TabGenerale({ form, set, editing }) {
  return (
    <div>
      <Row label="Nome organizzazione" value={form.nome} editing={editing}>
        <Input value={form.nome} onChange={set('nome')} placeholder="Nome visualizzato" />
      </Row>
      <Row label="Ragione sociale" value={form.ragione_sociale} editing={editing}>
        <Input value={form.ragione_sociale} onChange={set('ragione_sociale')} placeholder="Ragione sociale legale" />
      </Row>
      <Row label="Forma giuridica" value={form.forma_giuridica} editing={editing}>
        <Input value={form.forma_giuridica} onChange={set('forma_giuridica')} placeholder="S.r.l., Soc. Coop., S.p.A." />
      </Row>
      <Row label="Stato"
        value={form.attivo ? 'Attiva' : 'Disattiva'}
        editing={editing}
      >
        <select
          value={form.attivo ? 'true' : 'false'}
          onChange={e => set('attivo')(e.target.value === 'true')}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="true">Attiva</option>
          <option value="false">Disattiva</option>
        </select>
      </Row>
      <Row label="Descrizione" value={form.descrizione} editing={editing}>
        <TextareaInput value={form.descrizione} onChange={set('descrizione')} placeholder="Note interne" />
      </Row>
    </div>
  )
}

function TabSede({ form, set, editing }) {
  const indirizzoCompleto = [
    form.via && form.civico ? `${form.via} ${form.civico}` : form.via,
    form.cap,
    form.citta,
    form.provincia,
  ].filter(Boolean).join(', ')

  return (
    <div>
      <Row label="Via" value={form.via} editing={editing}>
        <Input value={form.via} onChange={set('via')} placeholder="Via Roma" />
      </Row>
      <Row label="Civico" value={form.civico} editing={editing}>
        <Input value={form.civico} onChange={set('civico')} placeholder="1" />
      </Row>
      <Row label="CAP" value={form.cap} editing={editing}>
        <Input value={form.cap} onChange={set('cap')} placeholder="00100" maxLength={5} />
      </Row>
      <Row label="Città" value={form.citta} editing={editing}>
        <Input value={form.citta} onChange={set('citta')} placeholder="Roma" />
      </Row>
      <Row label="Provincia" value={form.provincia} editing={editing}>
        <Input value={form.provincia} onChange={set('provincia')} placeholder="RM" maxLength={2} />
      </Row>
      <Row label="Regione" value={form.regione} editing={editing}>
        <Input value={form.regione} onChange={set('regione')} placeholder="Lazio" />
      </Row>
    </div>
  )
}

function TabContatti({ form, set, editing }) {
  return (
    <div>
      <Row label="Partita IVA" value={form.partita_iva} editing={editing}>
        <Input value={form.partita_iva} onChange={set('partita_iva')} placeholder="IT00000000000" maxLength={13} />
      </Row>
      <Row label="Codice Fiscale" value={form.codice_fiscale} editing={editing}>
        <Input value={form.codice_fiscale} onChange={set('codice_fiscale')} placeholder="00000000000" maxLength={16} />
      </Row>
      <Row label="Telefono" value={form.telefono} editing={editing}>
        <Input value={form.telefono} onChange={set('telefono')} placeholder="+39 06 00000000" type="tel" />
      </Row>
      <Row label="Email" value={form.email} editing={editing}>
        <Input value={form.email} onChange={set('email')} placeholder="info@azienda.it" type="email" />
      </Row>
      <Row label="PEC" value={form.pec} editing={editing}>
        <Input value={form.pec} onChange={set('pec')} placeholder="azienda@pec.it" type="email" />
      </Row>
      <Row label="Sito web" value={form.sito_web} editing={editing}>
        <Input value={form.sito_web} onChange={set('sito_web')} placeholder="www.azienda.it" />
      </Row>
    </div>
  )
}

function TabReferente({ form, set, editing }) {
  return (
    <div>
      <Row label="Nome" value={form.referente_nome} editing={editing}>
        <Input value={form.referente_nome} onChange={set('referente_nome')} placeholder="Mario Rossi" />
      </Row>
      <Row label="Ruolo / Qualifica" value={form.referente_ruolo} editing={editing}>
        <Input value={form.referente_ruolo} onChange={set('referente_ruolo')} placeholder="Responsabile IT" />
      </Row>
      <Row label="Telefono" value={form.referente_telefono} editing={editing}>
        <Input value={form.referente_telefono} onChange={set('referente_telefono')} placeholder="+39 333 0000000" type="tel" />
      </Row>
      <Row label="Email" value={form.referente_email} editing={editing}>
        <Input value={form.referente_email} onChange={set('referente_email')} placeholder="mario@azienda.it" type="email" />
      </Row>
    </div>
  )
}

function TabFatturazione({ form, set, editing }) {
  return (
    <div>
      <Row label="Regime fiscale" value={form.regime_fiscale} editing={editing}>
        <SelectInput value={form.regime_fiscale} onChange={set('regime_fiscale')} options={REGIMI} placeholder="Seleziona..." />
      </Row>
      <Row
        label="Codice SDI"
        value={form.codice_sdi}
        editing={editing}
      >
        <div>
          <Input value={form.codice_sdi} onChange={set('codice_sdi')} placeholder="0000000" maxLength={7} />
          <p className="text-xs text-gray-400 mt-0.5">Codice destinatario per fatturazione elettronica (7 caratteri)</p>
        </div>
      </Row>
      <Row label="PEC fatturazione" value={form.pec_fatturazione} editing={editing}>
        <Input value={form.pec_fatturazione} onChange={set('pec_fatturazione')} placeholder="fatture@pec.it" type="email" />
      </Row>
      <Row label="IBAN" value={form.iban} editing={editing}>
        <Input value={form.iban} onChange={set('iban')} placeholder="IT00 A000 0000 0000 0000 0000 000" maxLength={34} />
      </Row>
      <Row label="Banca" value={form.banca} editing={editing}>
        <Input value={form.banca} onChange={set('banca')} placeholder="Banca d'esempio" />
      </Row>
      <Row label="Intestatario conto" value={form.intestatario_conto} editing={editing}>
        <Input value={form.intestatario_conto} onChange={set('intestatario_conto')} placeholder="Ragione sociale o nome" />
      </Row>
      <Row label="Note fatturazione" value={form.note_fatturazione} editing={editing}>
        <TextareaInput value={form.note_fatturazione} onChange={set('note_fatturazione')} placeholder="Note aggiuntive..." />
      </Row>
    </div>
  )
}

// ── Pagina principale ─────────────────────────────────────────────────────────

export default function OrgAnagraficaPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const [org, setOrg] = useState(null)
  const [form, setForm] = useState({})
  const [activeTab, setActiveTab] = useState('generale')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val !== '' ? val : null }))

  useEffect(() => {
    organizzazioniApi.get(orgId)
      .then(r => { setOrg(r.data); setForm(r.data) })
      .catch(() => navigate('/organizzazioni'))
      .finally(() => setLoading(false))
  }, [orgId])

  const handleEdit = () => {
    setForm({ ...org })   // ripristina i valori originali prima di modificare
    setEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setForm({ ...org })
    setEditing(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await organizzazioniApi.update(orgId, form)
      setOrg(res.data)
      setForm(res.data)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">Caricamento...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/organizzazioni')}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{org?.nome}</h1>
          <p className="text-sm text-gray-500">Anagrafica e dati fatturazione</p>
        </div>

        {/* Azioni header */}
        <div className="flex items-center gap-2 shrink-0">
          {saved && !editing && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salvato
            </span>
          )}
          {!editing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifica
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner modifica attiva */}
      {editing && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Modalità modifica attiva — le modifiche non vengono salvate finché non premi <strong className="mx-1">Salva</strong>
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-0">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenuto tab */}
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 px-6 py-2">
        {activeTab === 'generale'     && <TabGenerale     form={form} set={set} editing={editing} />}
        {activeTab === 'sede'         && <TabSede         form={form} set={set} editing={editing} />}
        {activeTab === 'contatti'     && <TabContatti     form={form} set={set} editing={editing} />}
        {activeTab === 'referente'    && <TabReferente    form={form} set={set} editing={editing} />}
        {activeTab === 'fatturazione' && <TabFatturazione form={form} set={set} editing={editing} />}
      </div>
    </div>
  )
}
