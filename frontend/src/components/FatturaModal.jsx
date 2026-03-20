import { useState, useEffect } from 'react'
import { contabilitaApi } from '../api/client'
import { organizzazioniApi } from '../api/client'

const fmtEuro = (cents) => {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function VoceRow({ voce, idx, onUpdate, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-5">
        <input
          type="text"
          value={voce.descrizione}
          onChange={e => onUpdate(idx, 'descrizione', e.target.value)}
          placeholder="Descrizione"
          required
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-2">
        <input
          type="number"
          min="1"
          value={voce.quantita}
          onChange={e => onUpdate(idx, 'quantita', e.target.value)}
          placeholder="Qtà"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-3">
        <input
          type="number"
          step="0.01"
          min="0"
          value={voce.prezzo_unitario}
          onChange={e => onUpdate(idx, 'prezzo_unitario', e.target.value)}
          placeholder="Prezzo €"
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-1 text-right text-sm text-gray-500 pt-2">
        {fmtEuro(Math.round(Number(voce.quantita || 1) * Number(voce.prezzo_unitario || 0) * 100))}
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Rimuovi"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function FatturaModal({ fattura, onClose, onSaved }) {
  const editing = !!fattura
  const [orgs, setOrgs] = useState([])
  const [form, setForm] = useState({
    organizzazione_id: fattura?.organizzazione_id ?? '',
    data_emissione: fattura?.data_emissione ?? new Date().toISOString().slice(0, 10),
    data_scadenza: fattura?.data_scadenza ?? '',
    note: fattura?.note ?? '',
  })
  const [voci, setVoci] = useState(
    fattura?.voci?.map(v => ({
      descrizione: v.descrizione,
      quantita: v.quantita,
      prezzo_unitario: (v.prezzo_unitario / 100).toFixed(2),
    })) ?? [{ descrizione: '', quantita: 1, prezzo_unitario: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    organizzazioniApi.list().then(r => setOrgs(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const updateVoce = (idx, field, value) => {
    setVoci(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }
  const removeVoce = (idx) => setVoci(prev => prev.filter((_, i) => i !== idx))
  const addVoce = () => setVoci(prev => [...prev, { descrizione: '', quantita: 1, prezzo_unitario: '' }])

  const totale = voci.reduce((sum, v) => {
    return sum + Math.round(Number(v.quantita || 1) * Number(v.prezzo_unitario || 0) * 100)
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.organizzazione_id) { setError('Seleziona un\'organizzazione'); return }
    if (voci.length === 0) { setError('Aggiungi almeno una voce'); return }
    if (voci.some(v => !v.descrizione || v.prezzo_unitario === '')) {
      setError('Compila tutte le voci'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        organizzazione_id: Number(form.organizzazione_id),
        data_scadenza: form.data_scadenza || null,
        voci: voci.map(v => ({
          descrizione: v.descrizione,
          quantita: Number(v.quantita) || 1,
          prezzo_unitario: Math.round(Number(v.prezzo_unitario) * 100),
        })),
      }
      if (editing) {
        await contabilitaApi.updateFattura(fattura.id, payload)
      } else {
        await contabilitaApi.createFattura(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {editing ? `Modifica fattura ${fattura.numero}` : 'Nuova fattura'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizzazione</label>
              <select
                value={form.organizzazione_id}
                onChange={e => set('organizzazione_id', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona...</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data emissione</label>
              <input
                type="date"
                value={form.data_emissione}
                onChange={e => set('data_emissione', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data scadenza</label>
              <input
                type="date"
                value={form.data_scadenza}
                onChange={e => set('data_scadenza', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              rows={2}
              placeholder="Opzionale"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Voci */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Voci</label>
              <button
                type="button"
                onClick={addVoce}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Aggiungi voce
              </button>
            </div>
            <div className="space-y-2">
              {/* header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-0">
                <div className="col-span-5">Descrizione</div>
                <div className="col-span-2">Qtà</div>
                <div className="col-span-3">Prezzo unit.</div>
                <div className="col-span-1 text-right">Tot.</div>
                <div className="col-span-1" />
              </div>
              {voci.map((v, i) => (
                <VoceRow
                  key={i}
                  voce={v}
                  idx={i}
                  onUpdate={updateVoce}
                  onRemove={removeVoce}
                />
              ))}
              {voci.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">Nessuna voce</p>
              )}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-800">
                Totale: {fmtEuro(totale)}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            form="fattura-form"
            disabled={saving}
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea fattura'}
          </button>
        </div>
      </div>
    </div>
  )
}
