import { useState } from 'react'
import { contabilitaApi } from '../api/client'

const METODI = ['bonifico', 'contanti', 'carta', 'assegno', 'altro']

export default function PagamentoModal({ fatturaId, onClose, onSaved }) {
  const [form, setForm] = useState({
    data_pagamento: new Date().toISOString().slice(0, 10),
    importo: '',
    metodo: 'bonifico',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.importo || isNaN(form.importo) || Number(form.importo) <= 0) {
      setError('Inserisci un importo valido')
      return
    }
    setSaving(true)
    try {
      await contabilitaApi.addPagamento(fatturaId, {
        ...form,
        importo: Math.round(Number(form.importo) * 100),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Registra pagamento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data pagamento</label>
            <input
              type="date"
              value={form.data_pagamento}
              onChange={e => set('data_pagamento', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.importo}
              onChange={e => set('importo', e.target.value)}
              placeholder="0,00"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metodo</label>
            <select
              value={form.metodo}
              onChange={e => set('metodo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {METODI.map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input
              type="text"
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="Opzionale"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
