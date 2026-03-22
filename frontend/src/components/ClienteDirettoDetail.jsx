import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

function Field({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 break-words">{value}</dd>
    </div>
  )
}

function SediList({ clienteId }) {
  const [sedi, setSedi] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    axios.get(`/api/clienti-diretti/${clienteId}/sedi`)
      .then(r => setSedi(r.data))
      .finally(() => setLoading(false))
  }, [clienteId])

  useEffect(() => { load() }, [load])

  if (loading) return <p className="text-xs text-gray-400">Caricamento...</p>
  if (sedi.length === 0) return <p className="text-xs text-gray-400 italic">Nessuna sede aggiuntiva</p>

  return (
    <div className="space-y-2">
      {sedi.map(s => (
        <div key={s.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
          {s.nome && <p className="text-xs font-semibold text-gray-700">{s.nome}</p>}
          {(s.via || s.citta) && (
            <p className="text-xs text-gray-500">
              {[s.via && `${s.via}${s.civico ? ` ${s.civico}` : ''}`, s.cap, s.citta, s.provincia].filter(Boolean).join(', ')}
            </p>
          )}
          {s.telefono && <p className="text-xs text-gray-500">📞 {s.telefono}</p>}
          {(s.referente_nome || s.referente_telefono || s.referente_email) && (
            <p className="text-xs text-gray-400">
              Ref: {[s.referente_nome, s.referente_telefono, s.referente_email].filter(Boolean).join(' · ')}
            </p>
          )}
          {s.note && <p className="text-xs text-gray-400 italic">{s.note}</p>}
        </div>
      ))}
    </div>
  )
}

export default function ClienteDirettoDetail({ cliente, onClose, onModifica, onDelete, canEdit }) {
  if (!cliente) return null

  const addr = [
    cliente.via && `${cliente.via}${cliente.civico ? ` ${cliente.civico}` : ''}`,
    cliente.cap,
    cliente.citta,
    cliente.provincia ? `(${cliente.provincia})` : null,
  ].filter(Boolean).join(', ')

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="modal-panel relative w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b bg-gray-50 shrink-0">
            <div>
              <h2 className="font-bold text-gray-800 text-base">{cliente.ragione_sociale}</h2>
              {cliente.partita_iva && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">P.IVA {cliente.partita_iva}</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-3">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 space-y-5 overflow-y-auto">

            {/* Dati fiscali */}
            <dl className="grid grid-cols-2 gap-4">
              <Field label="P.IVA" value={cliente.partita_iva} />
              <Field label="Cod. Fiscale" value={cliente.codice_fiscale} />
            </dl>

            {/* Sede legale */}
            {addr && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sede legale</p>
                <p className="text-sm text-gray-700">{addr}</p>
                {cliente.regione && <p className="text-xs text-gray-400">{cliente.regione}</p>}
              </div>
            )}

            {/* Sedi aggiuntive */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sedi aggiuntive</p>
              <SediList clienteId={cliente.id} />
            </div>

            {/* Contatti */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contatti</p>
              <div className="space-y-1 text-sm">
                {cliente.telefono && (
                  <div>📞 <a href={`tel:${cliente.telefono}`} className="text-blue-600 hover:underline">{cliente.telefono}</a></div>
                )}
                {cliente.email && (
                  <div>✉️ <a href={`mailto:${cliente.email}`} className="text-blue-600 hover:underline">{cliente.email}</a></div>
                )}
                {cliente.pec && (
                  <div className="text-xs text-gray-500">PEC: <a href={`mailto:${cliente.pec}`} className="text-blue-500 hover:underline">{cliente.pec}</a></div>
                )}
                {cliente.sito_web && (
                  <div className="text-xs"><a href={cliente.sito_web} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{cliente.sito_web}</a></div>
                )}
              </div>
            </div>

            {/* Referente */}
            {cliente.referente_nome && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Referente principale</p>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-800">
                    {cliente.referente_nome}
                    {cliente.referente_ruolo && <span className="font-normal text-gray-500"> — {cliente.referente_ruolo}</span>}
                  </p>
                  {cliente.referente_telefono && (
                    <div className="text-sm">📞 <a href={`tel:${cliente.referente_telefono}`} className="text-blue-600 hover:underline">{cliente.referente_telefono}</a></div>
                  )}
                  {cliente.referente_email && (
                    <div className="text-sm">✉️ <a href={`mailto:${cliente.referente_email}`} className="text-blue-600 hover:underline">{cliente.referente_email}</a></div>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            {cliente.note && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Note</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{cliente.note}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {canEdit && (
            <div className="border-t px-5 py-4 flex gap-2 shrink-0 bg-gray-50">
              <button onClick={() => onModifica(cliente)}
                className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                Modifica
              </button>
              <button onClick={() => onDelete(cliente.id)}
                className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                Elimina
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
