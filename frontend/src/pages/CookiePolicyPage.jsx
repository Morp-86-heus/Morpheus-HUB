import { Link } from 'react-router-dom'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">

        <div className="mb-8">
          <Link to="/" className="text-sm text-blue-600 hover:underline">← Torna all'app</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Ai sensi dell'art. 122 del D.Lgs. 196/2003 e del Provvedimento del Garante dell'8 maggio 2014</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Cosa sono i cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web visitati dall'utente inviano al terminale
              (computer, tablet, smartphone) dove vengono memorizzati, per essere poi ritrasmessi agli stessi
              siti alla visita successiva. Grazie ai cookie un sito ricorda le azioni e le preferenze dell'utente
              per evitare di doverle reinserire ad ogni accesso.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">2. Cookie utilizzati da questa piattaforma</h2>
            <p className="mb-4">
              La presente piattaforma gestionale di <strong>Morpheus Hub S.r.l.</strong> utilizza
              <strong> esclusivamente cookie tecnici</strong>, necessari al corretto funzionamento dell'applicazione.
              Non vengono utilizzati cookie di profilazione, cookie di tracciamento o cookie di terze parti per finalità
              pubblicitarie o analitiche.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left font-semibold">Nome</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Finalità</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-mono text-gray-700">token</td>
                    <td className="px-4 py-3">Tecnico / Autenticazione</td>
                    <td className="px-4 py-3">Token JWT per il mantenimento della sessione autenticata. Salvato in <code className="bg-gray-100 px-1 rounded">localStorage</code> (se "Resta connesso" è attivo) o <code className="bg-gray-100 px-1 rounded">sessionStorage</code> (sessione corrente).</td>
                    <td className="px-4 py-3">Sessione o 30 giorni</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. Cookie tecnici e necessità del consenso</h2>
            <p>
              I cookie tecnici sono strettamente necessari per il funzionamento della piattaforma e per
              l'erogazione del servizio richiesto dall'utente. Ai sensi dell'art. 122, comma 1, del D.Lgs. 196/2003
              e delle Linee guida del Garante, per i cookie tecnici <strong>non è richiesto il consenso</strong> dell'utente.
              Tali cookie non possono essere disabilitati senza compromettere il funzionamento dell'applicazione.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. Come gestire i cookie</h2>
            <p className="mb-3">
              L'utente può controllare e gestire i cookie attraverso le impostazioni del proprio browser. Di seguito
              le istruzioni per i browser più diffusi:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.microsoft.com/it-it/windows/eliminare-e-gestire-i-cookie-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
              <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Apple Safari</a></li>
            </ul>
            <p className="mt-3 text-gray-500">
              Attenzione: la disabilitazione dei cookie tecnici potrebbe impedire l'accesso alla piattaforma
              o comprometterne il corretto funzionamento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Modifiche alla Cookie Policy</h2>
            <p>
              Morpheus Hub S.r.l. si riserva il diritto di modificare la presente Cookie Policy in qualsiasi momento,
              in particolare a seguito di variazioni della normativa applicabile. Le modifiche saranno pubblicate
              su questa pagina con l'indicazione della data di aggiornamento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Contatti</h2>
            <p>
              Per qualsiasi informazione relativa all'uso dei cookie e al trattamento dei dati personali, è possibile
              contattare Morpheus Hub S.r.l. all'indirizzo:{' '}
              <a href="mailto:privacy@morpheushub.it" className="text-blue-600 hover:underline">privacy@morpheushub.it</a>.
            </p>
            <p className="mt-2">
              Per l'informativa completa sul trattamento dei dati personali, consultare la{' '}
              <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
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
