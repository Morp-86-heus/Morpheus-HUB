import { Link } from 'react-router-dom'

export default function LicenzaPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">

        <div className="mb-8">
          <Link to="/" className="text-sm text-blue-600 hover:underline">← Torna all'app</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contratto di Licenza d'Uso</h1>
        <p className="text-sm text-gray-400 mb-8">Morpheus Hub — Licenza Software per Utente Finale (EULA)</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Definizioni</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>"Software"</strong>: la piattaforma web Morpheus Hub, comprensiva di tutte le sue componenti (backend, frontend, database, API, script di importazione e qualsiasi aggiornamento).</li>
              <li><strong>"Licenziante"</strong>: Morpheus Hub S.r.l., titolare esclusivo dei diritti sul Software.</li>
              <li><strong>"Licenziatario"</strong>: l'organizzazione o il soggetto che sottoscrive il contratto di utilizzo del Software.</li>
              <li><strong>"Utente"</strong>: qualsiasi persona fisica autorizzata dal Licenziatario ad accedere e utilizzare il Software.</li>
              <li><strong>"Dati"</strong>: tutte le informazioni inserite, generate o gestite attraverso il Software dal Licenziatario o dagli Utenti.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">2. Concessione della licenza</h2>
            <p className="mb-3">
              Il Licenziante concede al Licenziatario una licenza <strong>non esclusiva, non trasferibile, revocabile</strong> per
              accedere e utilizzare il Software esclusivamente tramite interfaccia web (SaaS), per la durata prevista dal piano
              sottoscritto e nei limiti del numero di Utenti abilitati.
            </p>
            <p>
              La licenza è valida solo per uso interno al Licenziatario e non può essere ceduta, sublicenziata o
              trasferita a terzi senza il previo consenso scritto del Licenziante.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. Attivazione e durata</h2>
            <p className="mb-3">
              La licenza decorre dalla data di attivazione dell'account e rimane valida per il periodo sottoscritto
              (mensile, annuale o altra durata concordata). Alla scadenza, se non rinnovata, l'accesso al Software
              viene sospeso dopo un <strong>periodo di tolleranza di 7 giorni</strong>.
            </p>
            <p>
              Il rinnovo deve essere richiesto prima della scadenza contattando il Licenziante all'indirizzo
              <a href="mailto:info@morpheushub.cloud" className="text-blue-600 hover:underline ml-1">info@morpheushub.cloud</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. Limitazioni d'uso</h2>
            <p className="mb-2">Il Licenziatario e gli Utenti non possono:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Copiare, riprodurre, modificare o creare opere derivate del Software o del suo codice sorgente;</li>
              <li>Decompilare, disassemblare o effettuare operazioni di reverse engineering sul Software;</li>
              <li>Rimuovere o alterare avvisi di copyright, marchi o altre indicazioni di proprietà presenti nel Software;</li>
              <li>Utilizzare il Software per scopi illegali o in violazione di qualsiasi normativa applicabile;</li>
              <li>Condividere le credenziali di accesso con soggetti non autorizzati;</li>
              <li>Tentare di accedere a funzionalità, dati o sistemi al di fuori di quanto concesso dalla propria licenza;</li>
              <li>Utilizzare il Software per fornire servizi a terzi (hosting, outsourcing, bureau service) senza autorizzazione scritta del Licenziante.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Proprietà intellettuale</h2>
            <p>
              Il Software, inclusi il codice sorgente, il design, la documentazione, i loghi e i marchi, è di
              proprietà esclusiva del Licenziante ed è protetto dalle leggi italiane ed europee in materia di
              proprietà intellettuale e diritto d'autore. Il presente contratto non trasferisce al Licenziatario
              alcun diritto di proprietà sul Software.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Dati del Licenziatario</h2>
            <p className="mb-3">
              I Dati inseriti nel Software rimangono di proprietà esclusiva del Licenziatario. Il Licenziante non
              rivendica alcun diritto su tali Dati e li utilizza esclusivamente per l'erogazione del servizio.
            </p>
            <p>
              In caso di cessazione del contratto, il Licenziatario può richiedere l'esportazione dei propri Dati
              entro 30 giorni dalla scadenza della licenza. Decorso tale termine, i Dati potranno essere eliminati
              definitivamente dai sistemi del Licenziante.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Aggiornamenti e manutenzione</h2>
            <p className="mb-3">
              Il Licenziante si riserva il diritto di rilasciare aggiornamenti, nuove versioni o modifiche al
              Software al fine di migliorarne le funzionalità, la sicurezza o la conformità normativa. Gli
              aggiornamenti sono inclusi nella licenza attiva e potranno essere installati con o senza preavviso.
            </p>
            <p>
              Il Licenziante potrà pianificare interventi di manutenzione programmata comunicandoli con ragionevole
              anticipo. Non è garantita la disponibilità continuativa del servizio (24/7) in assenza di specifici
              accordi di livello di servizio (SLA).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">8. Esclusione di garanzie</h2>
            <p>
              Il Software è fornito <strong>"così com'è"</strong> (<em>as is</em>). Il Licenziante non fornisce
              garanzie esplicite o implicite riguardo all'idoneità del Software per scopi specifici, all'assenza di
              difetti o all'ininterrotta disponibilità del servizio, salvo quanto espressamente pattuito per iscritto.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">9. Limitazione di responsabilità</h2>
            <p>
              Nei limiti consentiti dalla legge applicabile, il Licenziante non sarà responsabile per danni
              indiretti, incidentali, speciali o consequenziali derivanti dall'uso o dall'impossibilità di usare
              il Software, inclusi ma non limitati a perdita di dati, perdita di profitti o interruzione
              dell'attività. La responsabilità complessiva del Licenziante non eccederà in nessun caso l'importo
              corrisposto dal Licenziatario nei 12 mesi precedenti all'evento dannoso.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">10. Riservatezza</h2>
            <p>
              Entrambe le parti si impegnano a mantenere riservate le informazioni confidenziali ricevute nell'ambito
              del presente contratto e a non divulgarle a terzi senza il previo consenso scritto dell'altra parte,
              salvo obbligo di legge o ordine dell'autorità giudiziaria.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">11. Risoluzione del contratto</h2>
            <p className="mb-3">
              Il Licenziante potrà risolvere immediatamente il presente contratto in caso di violazione da parte del
              Licenziatario di uno qualsiasi degli obblighi previsti, inclusa la violazione delle limitazioni d'uso
              di cui all'articolo 4, previo invio di comunicazione scritta.
            </p>
            <p>
              Il Licenziatario può recedere dal contratto in qualsiasi momento, con effetto alla scadenza del periodo
              di licenza in corso, salvo diversi accordi contrattuali.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">12. Legge applicabile e foro competente</h2>
            <p>
              Il presente contratto è regolato dalla legge italiana. Per qualsiasi controversia derivante da o
              connessa al presente contratto, le parti concordano la competenza esclusiva del Tribunale del luogo
              in cui ha sede il Licenziante, salvo diversa disposizione di legge inderogabile.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">13. Modifiche al contratto</h2>
            <p>
              Il Licenziante si riserva il diritto di modificare il presente contratto. Le modifiche saranno
              comunicate al Licenziatario con almeno 30 giorni di anticipo tramite la piattaforma o via e-mail.
              Il proseguimento nell'utilizzo del Software dopo la scadenza del termine di preavviso costituisce
              accettazione delle nuove condizioni.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">14. Contatti</h2>
            <p>
              Per informazioni, richieste di rinnovo o segnalazioni relative alla licenza, contattare il Licenziante
              all'indirizzo: <a href="mailto:info@morpheushub.cloud" className="text-blue-600 hover:underline">info@morpheushub.cloud</a>.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6 text-xs text-gray-400">
            <p>Ultimo aggiornamento: marzo 2026 · Morpheus Hub S.r.l.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
