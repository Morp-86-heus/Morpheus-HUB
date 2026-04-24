import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketsApi, lookupApi } from '../api/client'
import axios from 'axios'
import RichTextEditor from './RichTextEditor'

const STATI = ['In gestione', 'Attesa parti', 'Sospesa', 'Chiusa', 'Annullata']

const STATO_COLORS = {
  'In gestione': 'text-blue-700',
  'Attesa parti': 'text-orange-700',
  'Sospesa': 'text-yellow-700',
  'Chiusa': 'text-gray-500',
  'Annullata': 'text-red-600',
}

function toDatetimeLocal(val) {
  if (!val) return ''
  const d = new Date(val)
  return d.toISOString().slice(0, 16)
}

export default function TicketForm({ initialData }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    commitente: '',
    cliente: '',
    nr_intervento: '',
    utente: '',
    citta: '',
    sla_scadenza: initialData?.sla_scadenza ? toDatetimeLocal(initialData.sla_scadenza) : '',
    ldv: '',
    stato: 'In gestione',
    note: '',
    data_gestione: initialData?.data_gestione || '',
    tecnico: '',
    nr_progressivo: '',
    dispositivo: '',
    ...initialData,
  })
  const [commitenti, setCommitenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [clientiDiretti, setClientiDiretti] = useState([])
  const [tecnici, setTecnici] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [progressivoInfo, setProgressivoInfo] = useState(null) // { next, usati }

  useEffect(() => {
    lookupApi.commitenti().then(r => setCommitenti(r.data))
    lookupApi.tecnici().then(r => setTecnici(r.data))
    axios.get('/api/clienti-diretti').then(r => setClientiDiretti(r.data))
  }, [])

  useEffect(() => {
    lookupApi.clienti(form.commitente || null).then(r => setClienti(r.data))
  }, [form.commitente])

  // Recupera info progressivo quando cambiano tecnico o data_gestione
  useEffect(() => {
    if (!form.tecnico || !form.data_gestione) { setProgressivoInfo(null); return }
    ticketsApi.nextProgressivo(form.tecnico, form.data_gestione, initialData?.id)
      .then(r => setProgressivoInfo(r.data))
      .catch(() => setProgressivoInfo(null))
  }, [form.tecnico, form.data_gestione])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calcola errore progressivo in tempo reale
  const rawNr = form.nr_progressivo
  const nrVal = (rawNr !== '' && rawNr !== null && rawNr !== undefined)
    ? parseInt(rawNr, 10)
    : null
  const progressivoError = (() => {
    if (nrVal === null || isNaN(nrVal)) return null   // campo vuoto → nessun errore
    if (!progressivoInfo) return null                 // info non ancora caricate → skip check
    if (nrVal < 1) return 'Il progressivo deve essere ≥ 1'
    if (progressivoInfo.usati.includes(nrVal)) return `Progressivo ${nrVal} già usato da ${form.tecnico} in questa data`
    if (nrVal > progressivoInfo.next) return `Non puoi saltare il progressivo ${progressivoInfo.next}`
    return null
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (progressivoError) return
    setSaving(true)
    setError(null)
    try {
      const nrProgr = (rawNr !== '' && rawNr !== null && rawNr !== undefined)
        ? parseInt(rawNr, 10)
        : null

      // Validazione progressivo con dati freschi dal server (evita problemi di timing)
      if (nrProgr !== null && !isNaN(nrProgr) && form.tecnico && form.data_gestione) {
        const res = await ticketsApi.nextProgressivo(form.tecnico, form.data_gestione, initialData?.id)
        const info = res.data
        if (info.usati.includes(nrProgr)) {
          setError(`Progressivo ${nrProgr} già usato da ${form.tecnico} in data ${form.data_gestione}.`)
          return
        }
        if (nrProgr > info.next) {
          setError(`Numero non sequenziale: il prossimo progressivo disponibile per ${form.tecnico} è ${info.next}.`)
          return
        }
      }

      const payload = {
        ...form,
        sla_scadenza: form.sla_scadenza || null,
        data_gestione: form.data_gestione || null,
        nr_progressivo: nrProgr,
      }
      if (initialData?.id) {
        await ticketsApi.update(initialData.id, payload)
      } else {
        await ticketsApi.create(payload)
      }
      navigate('/tickets')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Commitente</label>
          <select className={inputCls} value={form.commitente} onChange={e => set('commitente', e.target.value)}>
            <option value="">— Seleziona commitente —</option>
            {commitenti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Cliente</label>
          <select className={inputCls} value={form.cliente} onChange={e => set('cliente', e.target.value)}>
            <option value="">— Seleziona cliente —</option>
            {clienti.length > 0 && (
              <optgroup label="Clienti per commitente">
                {clienti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </optgroup>
            )}
            {clientiDiretti.length > 0 && (
              <optgroup label="Clienti Diretti">
                {clientiDiretti.map(c => <option key={`cd-${c.id}`} value={c.ragione_sociale}>{c.ragione_sociale}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className={labelCls}>NR INT</label>
          <input type="text" className={inputCls} value={form.nr_intervento} onChange={e => set('nr_intervento', e.target.value)} placeholder="es. 7000266205 / INC016853355" />
        </div>

        <div>
          <label className={labelCls}>Stato</label>
          <select className={`${inputCls} ${STATO_COLORS[form.stato] || ''}`} value={form.stato} onChange={e => set('stato', e.target.value)}>
            {STATI.map(s => <option key={s} value={s} className={STATO_COLORS[s]}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Utente</label>
          <input type="text" className={inputCls} value={form.utente} onChange={e => set('utente', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Città</label>
          <input type="text" className={inputCls} value={form.citta} onChange={e => set('citta', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Dispositivo</label>
          <input type="text" className={inputCls} value={form.dispositivo} onChange={e => set('dispositivo', e.target.value)} placeholder="es. Stampante HP LaserJet 400" />
        </div>

        <div>
          <label className={labelCls}>Tecnico</label>
          <select className={inputCls} value={form.tecnico} onChange={e => set('tecnico', e.target.value)}>
            <option value="">— Seleziona tecnico —</option>
            {tecnici.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Data Gestione</label>
          <input type="date" className={inputCls} value={form.data_gestione} onChange={e => set('data_gestione', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>SLA Scadenza</label>
          <input type="datetime-local" className={inputCls} value={form.sla_scadenza} onChange={e => set('sla_scadenza', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>N° progressivo intervento</label>
          <input
            type="number"
            min="1"
            step="1"
            className={`${inputCls} ${progressivoError ? 'border-red-400 focus:ring-red-300' : nrVal && !progressivoError ? 'border-green-400 focus:ring-green-300' : ''}`}
            value={form.nr_progressivo}
            onChange={e => set('nr_progressivo', e.target.value)}
            placeholder={progressivoInfo ? `Prossimo disponibile: ${progressivoInfo.next}` : 'es. 1, 2, 3…'}
          />
          {progressivoError && (
            <p className="text-xs text-red-500 mt-1 font-medium">{progressivoError}</p>
          )}
          {progressivoInfo && !progressivoError && (
            <p className="text-xs text-gray-400 mt-1">
              Prossimo: <span className="font-medium text-gray-600">{progressivoInfo.next}</span>
              {progressivoInfo.usati.length > 0 && ` · Già usati oggi: ${progressivoInfo.usati.join(', ')}`}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>LDV</label>
        <textarea rows={2} className={inputCls} value={form.ldv} onChange={e => set('ldv', e.target.value)} placeholder="Note spedizione, tracking GLS..." />
      </div>

      <div>
        <label className={labelCls}>Note</label>
        <RichTextEditor
          key={`note-${initialData?.id ?? 'new'}`}
          value={form.note}
          onChange={v => set('note', v)}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !!progressivoError}
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
          title={progressivoError || undefined}
        >
          {saving ? 'Salvataggio...' : initialData?.id ? 'Aggiorna Ticket' : 'Crea Ticket'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="px-6 py-2 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
