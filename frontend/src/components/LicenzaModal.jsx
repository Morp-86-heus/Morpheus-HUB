import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function LicenzaModal() {
  const { logout, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
        setScrolledToBottom(true)
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const handleAccetta = async () => {
    setLoading(true)
    try {
      await axios.post('/api/auth/accetta-licenza')
      await refreshUser()
    } catch {
      setLoading(false)
    }
  }

  const handleRifiuta = () => {
    logout()
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">M</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Contratto di Licenza d'Uso</h2>
          </div>
          <p className="text-xs text-gray-400">
            Leggi il contratto per intero prima di procedere. Devi scorrere fino in fondo per poter accettare.
          </p>
        </div>

        {/* Corpo scrollabile */}
        <div
          ref={bodyRef}
          className="overflow-y-auto flex-1 px-6 py-4 text-sm text-gray-700 leading-relaxed space-y-5"
        >
          <p className="text-xs text-gray-400 italic">Morpheus Hub — Licenza Software per Utente Finale (EULA) · Ultimo aggiornamento: marzo 2026</p>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">1. Definizioni</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>"Software"</strong>: la piattaforma web Morpheus Hub, comprensiva di tutte le sue componenti.</li>
              <li><strong>"Licenziante"</strong>: Morpheus Hub S.r.l., titolare esclusivo dei diritti sul Software.</li>
              <li><strong>"Licenziatario"</strong>: l'organizzazione o il soggetto che sottoscrive il contratto.</li>
              <li><strong>"Utente"</strong>: qualsiasi persona fisica autorizzata ad accedere e utilizzare il Software.</li>
              <li><strong>"Dati"</strong>: tutte le informazioni inserite o gestite attraverso il Software.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">2. Concessione della licenza</h3>
            <p>
              Il Licenziante concede al Licenziatario una licenza <strong>non esclusiva, non trasferibile, revocabile</strong> per
              accedere e utilizzare il Software esclusivamente tramite interfaccia web (SaaS), per la durata prevista
              dal piano sottoscritto e nei limiti del numero di Utenti abilitati. La licenza è valida solo per uso interno
              e non può essere ceduta, sublicenziata o trasferita a terzi senza il previo consenso scritto del Licenziante.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">3. Attivazione e durata</h3>
            <p>
              La licenza decorre dalla data di attivazione dell'account e rimane valida per il periodo sottoscritto.
              Alla scadenza, se non rinnovata, l'accesso viene sospeso dopo un <strong>periodo di tolleranza di 7 giorni</strong>.
              Il rinnovo va richiesto all'indirizzo{' '}
              <a href="mailto:info@morpheushub.cloud" className="text-blue-600 hover:underline">info@morpheushub.cloud</a>.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">4. Limitazioni d'uso</h3>
            <p className="mb-1">Il Licenziatario e gli Utenti non possono:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Copiare, riprodurre, modificare o creare opere derivate del Software;</li>
              <li>Decompilare, disassemblare o effettuare operazioni di reverse engineering;</li>
              <li>Rimuovere o alterare avvisi di copyright o marchi presenti nel Software;</li>
              <li>Utilizzare il Software per scopi illegali o in violazione di normative applicabili;</li>
              <li>Condividere le credenziali di accesso con soggetti non autorizzati;</li>
              <li>Tentare di accedere a funzionalità o dati al di fuori di quanto concesso dalla propria licenza;</li>
              <li>Utilizzare il Software per fornire servizi a terzi senza autorizzazione scritta del Licenziante.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">5. Proprietà intellettuale</h3>
            <p>
              Il Software è di proprietà esclusiva del Licenziante ed è protetto dalle leggi italiane ed europee in materia
              di proprietà intellettuale. Il presente contratto non trasferisce al Licenziatario alcun diritto di proprietà.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">6. Dati del Licenziatario</h3>
            <p>
              I Dati rimangono di proprietà esclusiva del Licenziatario. In caso di cessazione del contratto, è possibile
              richiedere l'esportazione dei propri Dati entro 30 giorni dalla scadenza della licenza.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">7. Aggiornamenti e manutenzione</h3>
            <p>
              Il Licenziante si riserva il diritto di rilasciare aggiornamenti al Software, inclusi nella licenza attiva.
              Il Licenziante non garantisce la disponibilità continuativa del servizio (24/7) in assenza di specifici accordi SLA.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">8. Esclusione di garanzie</h3>
            <p>
              Il Software è fornito <strong>"così com'è"</strong> (<em>as is</em>). Il Licenziante non fornisce garanzie
              esplicite o implicite riguardo all'idoneità del Software per scopi specifici o all'ininterrotta disponibilità
              del servizio, salvo quanto espressamente pattuito per iscritto.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">9. Limitazione di responsabilità</h3>
            <p>
              Nei limiti consentiti dalla legge, il Licenziante non sarà responsabile per danni indiretti, incidentali o
              consequenziali. La responsabilità complessiva non eccederà in nessun caso l'importo corrisposto dal
              Licenziatario nei 12 mesi precedenti all'evento dannoso.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">10. Riservatezza</h3>
            <p>
              Entrambe le parti si impegnano a mantenere riservate le informazioni confidenziali ricevute nell'ambito del
              presente contratto e a non divulgarle a terzi senza il previo consenso scritto dell'altra parte.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">11. Risoluzione del contratto</h3>
            <p>
              Il Licenziante potrà risolvere immediatamente il contratto in caso di violazione degli obblighi previsti,
              previo invio di comunicazione scritta. Il Licenziatario può recedere con effetto alla scadenza del periodo in corso.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">12. Legge applicabile e foro competente</h3>
            <p>
              Il presente contratto è regolato dalla legge italiana. Per qualsiasi controversia le parti concordano la
              competenza esclusiva del Tribunale del luogo in cui ha sede il Licenziante.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">13. Modifiche al contratto</h3>
            <p>
              Il Licenziante si riserva il diritto di modificare il presente contratto con almeno 30 giorni di preavviso.
              Il proseguimento nell'utilizzo del Software costituisce accettazione delle nuove condizioni.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">14. Contatti</h3>
            <p>
              Per informazioni: <a href="mailto:info@morpheushub.cloud" className="text-blue-600 hover:underline">info@morpheushub.cloud</a>
            </p>
          </section>

          {/* Indicatore fine testo */}
          <div className="pt-2 pb-1 text-center text-xs text-gray-400">— Fine del contratto —</div>
        </div>

        {/* Indicatore scroll */}
        {!scrolledToBottom && (
          <div className="px-6 py-2 bg-amber-50 border-t border-amber-100 shrink-0">
            <p className="text-xs text-amber-700 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Scorri fino in fondo per abilitare il tasto "Accetto"
            </p>
          </div>
        )}

        {/* Footer azioni */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleRifiuta}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Rifiuto — Esci
          </button>
          <button
            onClick={handleAccetta}
            disabled={!scrolledToBottom || loading}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              scrolledToBottom && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Salvataggio…' : 'Accetto il contratto di licenza'}
          </button>
        </div>
      </div>
    </div>
  )
}
