import { useState, useEffect } from 'react'
import { contabilitaApi } from '../api/client'
import FatturaModal from './FatturaModal'
import PagamentoModal from './PagamentoModal'

const fmtEuro = (cents) => {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT')
}

const STATO_BADGE = {
  bozza:    'bg-gray-100 text-gray-700',
  inviata:  'bg-blue-100 text-blue-700',
  pagata:   'bg-green-100 text-green-700',
  scaduta:  'bg-red-100 text-red-700',
  annullata:'bg-yellow-100 text-yellow-700',
}

export default function FatturaDetail({ fatturaId, onClose, onChanged }) {
  const [fattura, setFattura] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPagamento, setShowPagamento] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await contabilitaApi.getFattura(fatturaId)
      setFattura(r.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [fatturaId])

  const handleInvia = async () => {
    setActionLoading(true)
    try { await contabilitaApi.invia(fatturaId); await load(); onChanged() }
    finally { setActionLoading(false) }
  }

  const handleAnnulla = async () => {
    setActionLoading(true)
    try { await contabilitaApi.annulla(fatturaId); await load(); onChanged() }
    finally { setActionLoading(false) }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try { await contabilitaApi.deleteFattura(fatturaId); onClose(); onChanged() }
    finally { setActionLoading(false) }
  }

  const handleDeletePagamento = async (pid) => {
    setActionLoading(true)
    try { await contabilitaApi.deletePagamento(fatturaId, pid); await load(); onChanged() }
    finally { setActionLoading(false) }
  }

  const importoPagato = fattura?.pagamenti?.reduce((s, p) => s + p.importo, 0) ?? 0
  const importoRimanente = fattura ? fattura.importo_totale - importoPagato : 0

  const canEdit = fattura && (fattura.stato === 'bozza' || fattura.stato === 'inviata')
  const canInvia = fattura?.stato === 'bozza'
  const canAnnulla = fattura && ['bozza', 'inviata', 'scaduta'].includes(fattura.stato)
  const canDelete = fattura?.stato === 'bozza'
  const canAddPagamento = fattura && ['inviata', 'scaduta'].includes(fattura.stato)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            {fattura && (
              <>
                <h2 className="text-lg font-semibold text-gray-800">Fattura {fattura.numero}</h2>
                <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium mt-0.5 ${STATO_BADGE[fattura.stato] || 'bg-gray-100 text-gray-700'}`}>
                  {fattura.stato}
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Caricamento…</div>
        ) : !fattura ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Fattura non trovata</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Info principali */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Organizzazione</span>
                <p className="font-medium text-gray-800 mt-0.5">{fattura.organizzazione_nome || '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">Data emissione</span>
                <p className="font-medium text-gray-800 mt-0.5">{fmtDate(fattura.data_emissione)}</p>
              </div>
              <div>
                <span className="text-gray-500">Data scadenza</span>
                <p className="font-medium text-gray-800 mt-0.5">{fmtDate(fattura.data_scadenza)}</p>
              </div>
              <div>
                <span className="text-gray-500">Totale</span>
                <p className="font-semibold text-gray-800 mt-0.5 text-base">{fmtEuro(fattura.importo_totale)}</p>
              </div>
              {fattura.note && (
                <div className="col-span-2">
                  <span className="text-gray-500">Note</span>
                  <p className="text-gray-700 mt-0.5">{fattura.note}</p>
                </div>
              )}
            </div>

            {/* Riepilogo pagamento */}
            {['inviata', 'pagata', 'scaduta'].includes(fattura.stato) && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pagato</span>
                  <span className="font-medium text-green-700">{fmtEuro(importoPagato)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-gray-600 font-medium">Rimanente</span>
                  <span className={`font-semibold ${importoRimanente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmtEuro(importoRimanente)}
                  </span>
                </div>
              </div>
            )}

            {/* Voci */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Voci</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Descrizione</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Qtà</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Prezzo</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Importo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fattura.voci?.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{v.descrizione}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{v.quantita}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{fmtEuro(v.prezzo_unitario)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">{fmtEuro(v.importo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Totale</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtEuro(fattura.importo_totale)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Pagamenti */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Pagamenti</h3>
                {canAddPagamento && (
                  <button
                    onClick={() => setShowPagamento(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Registra
                  </button>
                )}
              </div>
              {fattura.pagamenti?.length === 0 ? (
                <p className="text-sm text-gray-400">Nessun pagamento registrato</p>
              ) : (
                <div className="space-y-2">
                  {fattura.pagamenti?.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{fmtEuro(p.importo)}</span>
                        <span className="text-gray-500 ml-2">{fmtDate(p.data_pagamento)}</span>
                        <span className="text-gray-400 ml-2 capitalize">{p.metodo}</span>
                        {p.note && <span className="text-gray-400 ml-2">— {p.note}</span>}
                      </div>
                      {fattura.stato !== 'pagata' && (
                        <button
                          onClick={() => handleDeletePagamento(p.id)}
                          disabled={actionLoading}
                          className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                          title="Elimina pagamento"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {fattura && (
          <div className="border-t border-gray-200 px-6 py-4 shrink-0 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {canInvia && (
                <button
                  onClick={handleInvia}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Invia fattura
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Modifica
                </button>
              )}
              {canAddPagamento && (
                <button
                  onClick={() => setShowPagamento(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Registra pagamento
                </button>
              )}
              {canAnnulla && (
                <button
                  onClick={handleAnnulla}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                >
                  Annulla
                </button>
              )}
              {canDelete && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Elimina
                </button>
              )}
              {confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Confermi l'eliminazione?</span>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Sì, elimina
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <FatturaModal
          fattura={fattura}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); onChanged() }}
        />
      )}
      {showPagamento && (
        <PagamentoModal
          fatturaId={fatturaId}
          onClose={() => setShowPagamento(false)}
          onSaved={() => { setShowPagamento(false); load(); onChanged() }}
        />
      )}
    </>
  )
}
