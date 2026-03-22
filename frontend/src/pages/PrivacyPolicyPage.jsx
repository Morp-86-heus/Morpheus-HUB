import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">

        <div className="mb-8">
          <Link to="/" className="text-sm text-blue-600 hover:underline">← Torna all'app</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Informativa sul trattamento dei dati personali</h1>
        <p className="text-sm text-gray-400 mb-8">Ai sensi degli artt. 13-14 del Regolamento UE 2016/679 (GDPR)</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Titolare del trattamento</h2>
            <p>
              Il Titolare del trattamento dei dati personali è <strong>Morpheus Hub S.r.l.</strong>, con sede legale in Italia.
              Per qualsiasi richiesta relativa al trattamento dei dati personali è possibile contattare il Titolare
              all'indirizzo e-mail: <a href="mailto:privacy@morpheushub.cloud" className="text-blue-600 hover:underline">privacy@morpheushub.cloud</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">2. Dati trattati e finalità</h2>
            <p className="mb-3">
              La presente piattaforma gestionale è destinata a <strong>dipendenti e collaboratori interni</strong> di Morpheus Hub S.r.l.
              e a <strong>clienti esterni</strong> autorizzati. I dati personali trattati attraverso la piattaforma sono:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Dati di accesso:</strong> nome, cognome, indirizzo e-mail, credenziali di autenticazione — raccolti per consentire l'accesso sicuro alla piattaforma.</li>
              <li><strong>Dati operativi:</strong> informazioni inserite nei ticket di assistenza tecnica (descrizioni degli interventi, date, tecnici assegnati, clienti, sedi operative) — trattati per la gestione e il tracciamento delle attività di assistenza tecnica.</li>
              <li><strong>Dati delle anagrafiche:</strong> ragione sociale, partita IVA, recapiti telefonici, indirizzi e-mail, indirizzi fisici delle sedi — trattati per la gestione dei rapporti commerciali e tecnici.</li>
              <li><strong>Log di sistema:</strong> indirizzo IP, timestamp di accesso — trattati per finalità di sicurezza informatica e controllo degli accessi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. Base giuridica del trattamento</h2>
            <p>Il trattamento dei dati personali si fonda sulle seguenti basi giuridiche:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Esecuzione di un contratto</strong> (art. 6, par. 1, lett. b GDPR): per i dati necessari alla fornitura dei servizi di assistenza tecnica e alla gestione del rapporto lavorativo.</li>
              <li><strong>Legittimo interesse</strong> (art. 6, par. 1, lett. f GDPR): per le finalità di sicurezza informatica e prevenzione di accessi non autorizzati.</li>
              <li><strong>Obbligo legale</strong> (art. 6, par. 1, lett. c GDPR): ove applicabile, per il rispetto di obblighi normativi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. Modalità del trattamento e conservazione</h2>
            <p className="mb-3">
              I dati sono trattati con strumenti elettronici e conservati su server protetti. Sono adottate misure tecniche
              e organizzative adeguate a garantire la sicurezza dei dati (cifratura delle password, accesso basato su ruoli,
              connessioni protette).
            </p>
            <p>
              I dati sono conservati per il tempo strettamente necessario al perseguimento delle finalità per cui sono
              stati raccolti e, comunque, nel rispetto dei termini di conservazione previsti dalla normativa vigente.
              I dati degli utenti disattivati vengono anonimizzati o cancellati entro 12 mesi dalla disattivazione dell'account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Comunicazione e trasferimento dei dati</h2>
            <p>
              I dati personali non sono ceduti a terzi né diffusi. Possono essere comunicati a soggetti che prestano
              servizi strumentali all'attività del Titolare (es. fornitori di infrastruttura cloud, assistenza tecnica
              ai sistemi informatici), operanti in qualità di Responsabili del trattamento ai sensi dell'art. 28 GDPR,
              vincolati da specifici accordi di riservatezza e protezione dei dati.
            </p>
            <p className="mt-2">
              I dati non sono trasferiti verso Paesi terzi al di fuori dello Spazio Economico Europeo, salvo che ciò
              avvenga nel rispetto delle garanzie previste dal GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Diritti degli interessati</h2>
            <p className="mb-3">
              In qualità di interessato, l'utente ha il diritto di:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Accedere ai propri dati personali (art. 15 GDPR)</li>
              <li>Ottenere la rettifica di dati inesatti (art. 16 GDPR)</li>
              <li>Richiedere la cancellazione dei dati ("diritto all'oblio") nei casi previsti (art. 17 GDPR)</li>
              <li>Richiedere la limitazione del trattamento (art. 18 GDPR)</li>
              <li>Ricevere i propri dati in formato strutturato (portabilità, art. 20 GDPR)</li>
              <li>Opporsi al trattamento per motivi legittimi (art. 21 GDPR)</li>
              <li>Proporre reclamo all'Autorità Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">www.garanteprivacy.it</a>)</li>
            </ul>
            <p className="mt-3">
              Per esercitare i propri diritti, è possibile inviare una richiesta a{' '}
              <a href="mailto:privacy@morpheushub.cloud" className="text-blue-600 hover:underline">privacy@morpheushub.cloud</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Aggiornamenti</h2>
            <p>
              Il Titolare si riserva il diritto di aggiornare la presente informativa. Le modifiche saranno comunicate
              agli utenti tramite la piattaforma o via e-mail. La data dell'ultimo aggiornamento è indicata in calce.
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
