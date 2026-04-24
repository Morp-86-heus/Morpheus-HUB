import { useState } from 'react'
import api from '../api/client'

function AuthDoc({ src, alt, className }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const isPdf = src.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    let url = null
    api.get(src, { responseType: 'blob' })
      .then(res => { url = URL.createObjectURL(res.data); setBlobUrl(url) })
      .catch(() => setBlobUrl(''))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [src])

  const openFull = () => { if (blobUrl) window.open(blobUrl, '_blank') }

  if (blobUrl === null) return <div className={`${className} bg-gray-100 animate-pulse`} />
  if (blobUrl === '') return <div className={`${className} bg-gray-100 flex items-center justify-center text-xs text-gray-400`}>errore</div>

  if (isPdf) return (
    <div className={`${className} bg-red-50 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-red-100 transition-colors`} onClick={openFull}>
      <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6M9 17h4" />
      </svg>
      <span className="text-xs font-bold text-red-500 uppercase tracking-wide">PDF</span>
      <span className="text-xs text-red-400">Apri</span>
    </div>
  )

  return <img src={blobUrl} alt={alt} className={`${className} cursor-pointer`} onClick={openFull} />
}
import { useNavigate } from 'react-router-dom'
import { ticketsApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import SLABadge from './SLABadge'
import CloseTicketModal from './CloseTicketModal'

const STATO_COLORS = {
  'In gestione': 'bg-blue-100 text-blue-700',
  'Attesa parti': 'bg-orange-100 text-orange-700',
  'Sospesa': 'bg-yellow-100 text-yellow-700',
  'Chiusa': 'bg-gray-100 text-gray-500',
  'Annullata': 'bg-red-100 text-red-600',
}

function Field({ label, value, mono }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-0.5 text-sm text-gray-800 break-words ${mono ? 'font-mono' : ''}`}>{value === true ? 'Sì' : value === false ? 'No' : value}</dd>
    </div>
  )
}

function ChiusuraSection({ chiusura, ticketId }) {
  if (!chiusura) return null

  let parti = []
  try { parti = JSON.parse(chiusura.parti_json || '[]') } catch {}

  let prestazioni = []
  try { prestazioni = JSON.parse(chiusura.prestazioni_json || '[]') } catch {}

  let documenti = []
  try { documenti = JSON.parse(chiusura.documenti_json || '[]') } catch {}

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—'

  const SubLabel = ({ children }) => (
    <span className="text-xs text-gray-400 uppercase tracking-wide">{children}</span>
  )
  const SubVal = ({ children, mono }) => (
    <span className={`text-xs text-gray-700 ${mono ? 'font-mono' : ''}`}>{children || '—'}</span>
  )

  return (
    <div className="col-span-full mt-2 bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
      <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Dati chiusura</h4>

      {/* Tempi e intestazione */}
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-gray-400">Inizio intervento</dt>
          <dd className="text-sm text-gray-800">{fmtDate(chiusura.data_inizio)} {chiusura.ora_inizio || ''}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Fine intervento</dt>
          <dd className="text-sm text-gray-800">{fmtDate(chiusura.data_fine)} {chiusura.ora_fine || ''}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Tecnico</dt>
          <dd className="text-sm text-gray-800">{chiusura.tecnico_nome || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Esito</dt>
          <dd className="text-sm font-medium text-green-700">{chiusura.esito || '—'}</dd>
        </div>
        {chiusura.note_chiusura && (
          <div className="col-span-2">
            <dt className="text-xs text-gray-400">Note chiusura</dt>
            <dd className="text-sm text-gray-800 whitespace-pre-wrap">{chiusura.note_chiusura}</dd>
          </div>
        )}
      </dl>

      {/* Parti sostituite */}
      {parti.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parti sostituite ({parti.length})</p>
          <div className="space-y-2">
            {parti.map((p, i) => (
              <div key={i} className="bg-white border border-green-100 rounded-lg p-3 space-y-2">
                {/* Parte guasta */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Parte guasta</span>
                    {p.tipo && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.tipo === 'DOA' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                        {p.tipo}
                      </span>
                    )}
                    {p.parte_ritirata && <span className="text-xs text-orange-600 font-medium">· Ritirata</span>}
                    {p.parte_da_riparare && <span className="text-xs text-blue-600 font-medium">· Da riparare</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><SubLabel>Descrizione</SubLabel><br /><SubVal>{p.descrizione}</SubVal></div>
                    {p.modello && <div><SubLabel>Modello</SubLabel><br /><SubVal>{p.modello}</SubVal></div>}
                    {p.seriale && <div><SubLabel>Seriale</SubLabel><br /><SubVal mono>{p.seriale}</SubVal></div>}
                    {p.pn && <div><SubLabel>P/N</SubLabel><br /><SubVal mono>{p.pn}</SubVal></div>}
                    {p.cespite && <div><SubLabel>Cespite</SubLabel><br /><SubVal mono>{p.cespite}</SubVal></div>}
                    {p.difetto && <div className="col-span-2"><SubLabel>Difetto</SubLabel><br /><SubVal>{p.difetto}</SubVal></div>}
                  </div>
                </div>

                {/* Ricambio installato */}
                {(p.ricambio_descrizione || p.ricambio_seriale || p.ricambio_pn || p.ricambio_cespite) && (
                  <>
                    <div className="border-t border-dashed border-gray-200" />
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">Ricambio installato</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {p.ricambio_descrizione && <div><SubLabel>Descrizione</SubLabel><br /><SubVal>{p.ricambio_descrizione}</SubVal></div>}
                        {p.ricambio_modello && <div><SubLabel>Modello</SubLabel><br /><SubVal>{p.ricambio_modello}</SubVal></div>}
                        {p.ricambio_seriale && <div><SubLabel>Seriale</SubLabel><br /><SubVal mono>{p.ricambio_seriale}</SubVal></div>}
                        {p.ricambio_pn && <div><SubLabel>P/N</SubLabel><br /><SubVal mono>{p.ricambio_pn}</SubVal></div>}
                        {p.ricambio_cespite && <div><SubLabel>Cespite</SubLabel><br /><SubVal mono>{p.ricambio_cespite}</SubVal></div>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prestazioni / listino */}
      {prestazioni.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prestazioni ({prestazioni.length})</p>
          <div className="bg-white border border-green-100 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-400 uppercase">
                <tr>
                  <th className="px-3 py-1.5 text-left font-semibold">Descrizione</th>
                  <th className="px-3 py-1.5 text-center font-semibold">Q.tà</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Prezzo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prestazioni.map((pr, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-gray-800">{pr.descrizione}</td>
                    <td className="px-3 py-1.5 text-center text-gray-600">{pr.quantita ?? 1} {pr.unita_misura || ''}</td>
                    <td className="px-3 py-1.5 text-right text-gray-700 font-mono">
                      {pr.prezzo ? `€ ${(parseFloat(String(pr.prezzo).replace(',', '.')) * (pr.quantita ?? 1)).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documenti allegati */}
      {documenti.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documenti allegati ({documenti.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {documenti.map((d, i) => {
              const filename = d.path.split('/').pop()
              const url = `/tickets/${ticketId}/documenti/${filename}`
              return (
                <div key={i} className="rounded-lg overflow-hidden border border-green-100 bg-white hover:border-green-400 transition-colors">
                  <AuthDoc src={url} alt={d.nome} className="w-full aspect-[4/3] object-cover" />
                  <p className="text-xs text-gray-500 truncate px-2 py-1">{d.nome}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function DisponibilitaSection({ orariApertura, giorniChiusura }) {
  const orari = orariApertura || []
  const giorni = giorniChiusura || []
  const hasData = orari.length > 0 || giorni.length > 0
  const [open, setOpen] = useState(hasData)

  if (!hasData) return null

  return (
    <div className="col-span-full mt-1 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Orari e disponibilità
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">
          {orari.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Orari di apertura</p>
              <div className="flex flex-wrap gap-1.5">
                {orari.map((o, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-mono">{o}</span>
                ))}
              </div>
            </div>
          )}
          {giorni.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Giorni di chiusura</p>
              <div className="flex flex-wrap gap-1.5">
                {giorni.map((g, i) => (
                  <span key={i} className="px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TicketDetail({ ticket, onClose, onDeleted, onRefresh }) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (!ticket) return null

  const isClosed = ticket.stato === 'Chiusa' || ticket.stato === 'Annullata'

  const handleDelete = async () => {
    if (!confirm(`Eliminare il ticket #${ticket.id}?`)) return
    setDeleting(true)
    try {
      await ticketsApi.delete(ticket.id)
      onDeleted && onDeleted(ticket.id)
      onClose()
    } catch {
      alert('Errore durante eliminazione')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className={`modal-panel relative w-full ${expanded ? 'max-w-[calc(100vw-16rem)]' : 'max-w-md'} bg-white shadow-2xl overflow-y-auto flex flex-col transition-all duration-200`}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
            <div>
              <h2 className="font-bold text-gray-800">Ticket #{ticket.id}</h2>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${STATO_COLORS[ticket.stato] || ''}`}>
                {ticket.stato}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
                title={expanded ? 'Comprimi pannello' : 'Espandi pannello'}
              >
                {expanded ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0h5m-5 0v5m6 6l5 5m0 0h-5m5 0v-5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
          </div>

          {/* Body */}
          <dl className={`flex-1 p-5 grid gap-4 ${expanded ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {ticket.parent_ticket_id && (
              <div className="col-span-full px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                ↩ {ticket.numero_intervento}° intervento — seguito del ticket{' '}
                <span className="font-bold font-mono">#{ticket.parent_ticket_id}</span>
              </div>
            )}
            <Field label="NR INT" value={ticket.nr_intervento} mono />
            <Field label="SLA" value={<SLABadge sla={ticket.sla_scadenza} stato={ticket.stato} />} />
            <Field label="Commitente" value={ticket.commitente} />
            <Field label="Cliente" value={ticket.cliente} />
            <Field
              label="Tecnico"
              value={ticket.tecnico || (ticket.tecnico_esterno ? `${ticket.tecnico_esterno} (est.)` : null)}
            />
            <Field label="Data gestione" value={ticket.data_gestione ? new Date(ticket.data_gestione).toLocaleDateString('it-IT') : null} />
            <Field label="Utente" value={ticket.utente} />
            <Field label="Città" value={ticket.citta} />
            <Field label="Dispositivo" value={ticket.dispositivo} />
            <Field label="N° progressivo" value={ticket.nr_progressivo ?? null} />
            <div className="col-span-full">
              <Field label="LDV" value={ticket.ldv} />
            </div>
            {ticket.note && (
              <div className="col-span-full">
                <dt className="text-xs text-gray-400 uppercase tracking-wide">Note</dt>
                <dd
                  className="mt-0.5 text-sm text-gray-800 rich-note"
                  dangerouslySetInnerHTML={{ __html: ticket.note }}
                />
              </div>
            )}

            {/* Orari e disponibilità */}
            <DisponibilitaSection
              orariApertura={ticket.orari_apertura}
              giorniChiusura={ticket.giorni_chiusura}
            />

            {/* Dati chiusura se presenti */}
            <ChiusuraSection chiusura={ticket.chiusura} ticketId={ticket.id} />

            <div className="col-span-full text-xs text-gray-300">
              <div>Creato: {ticket.created_at ? new Date(ticket.created_at).toLocaleString('it-IT') : '—'}</div>
              <div>Aggiornato: {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString('it-IT') : '—'}</div>
            </div>
          </dl>

          {/* Footer */}
          <div className="px-5 py-4 border-t bg-gray-50 space-y-2">
            <div className="flex gap-2">
              {can('ticket.edit') && (
                <button
                  onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                  className="flex-1 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
                >
                  Modifica
                </button>
              )}
              {!isClosed && can('ticket.close') && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex-1 bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700"
                >
                  Chiudi ticket
                </button>
              )}
              {can('ticket.delete') && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  Elimina
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCloseModal && (
        <CloseTicketModal
          ticket={ticket}
          onClose={() => setShowCloseModal(false)}
          onClosed={() => {
            setShowCloseModal(false)
            onRefresh && onRefresh()
            onClose()
          }}
        />
      )}
    </>
  )
}
