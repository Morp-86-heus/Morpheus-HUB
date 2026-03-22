# Morpheus Hub — Brief per sito istituzionale e landing page

## Il prodotto

**Morpheus Hub** è una piattaforma gestionale web SaaS per aziende che erogano servizi di assistenza tecnica.
Nasce come evoluzione digitale del classico foglio Excel: permette di gestire ticket, tecnici, clienti, magazzino, contratti e molto altro — tutto in un'unica interfaccia moderna, accessibile da browser, senza installazioni.

**URL app:** `https://app.morpheushub.cloud`
**URL sito:** `https://morpheushub.cloud`

---

## A chi si rivolge

### Target primario — Aziende di assistenza tecnica
Società che gestiscono interventi sul campo (IT, elettronica, macchinari, impianti) con un team di tecnici interni e/o esterni.

**Dimensioni:** da 2 a 50 dipendenti
**Settori:** IT services, assistenza hardware, manutenzione impianti, field service
**Pain point principale:** usano ancora Excel, WhatsApp o carta per tracciare gli interventi — perdono tempo, fanno errori, non hanno visibilità in tempo reale

### Target secondario — Aziende con clienti in outsourcing
Società che ricevono ticket da committenti (grandi aziende) e li smistano ai propri tecnici.

---

## Problemi che risolve

1. **Niente più Excel condivisi** — un unico sistema sempre aggiornato, accessibile da qualsiasi dispositivo
2. **Tracciabilità completa** — ogni ticket ha uno stato, un tecnico assegnato, una scadenza SLA
3. **Visibilità in tempo reale** — dashboard con KPI, alert SLA, statistiche per tecnico
4. **Gestione clienti centralizzata** — anagrafiche complete con sedi multiple, referenti, contratti
5. **Controllo del magazzino** — parti di ricambio sempre sotto controllo
6. **Fatturazione e contabilità integrata** — dal ticket alla fattura senza cambiare software
7. **Multi-ruolo** — proprietario, amministratore, commerciale, tecnico: ognuno vede solo quello che serve

---

## Funzionalità principali

### Gestione Ticket
- Creazione rapida con tutti i dati dell'intervento
- Stati: In gestione / Attesa parti / Sospesa / Chiusa / Annullata
- Semaforo SLA (verde/giallo/rosso) per rispettare le scadenze
- Storico completo con filtri avanzati ed export Excel
- Allegati: foto, PDF, documenti di chiusura

### Anagrafiche
- Committenti e clienti con gerarchia (committente → clienti associati)
- Clienti diretti con sedi multiple e referenti
- Tecnici con profilo completo

### Dashboard & Statistiche
- KPI in tempo reale: ticket aperti, in gestione, in attesa parti
- Alert SLA scadute o in scadenza oggi
- Grafici trend mensile, distribuzione per stato, compliance SLA
- Statistiche per tecnico

### Magazzino
- Catalogo articoli con giacenze
- Movimenti di carico/scarico
- Collegamento ai ticket (parti utilizzate)

### Customer Manager
- Listini prezzi per committente
- Catalogo servizi con prezzi
- Contratti e abbonamenti ricorrenti
- Funnel vendite (CRM leggero)

### Calendario
- Vista mese/settimana degli eventi e degli interventi
- Ispirato a Google Calendar

### Contabilità
- Fatture attive e passive
- Prima nota
- Report economici

### Amministrazione
- Gestione utenti con ruoli e permessi granulari
- Configurazione SMTP per notifiche email
- Backup e ripristino database
- Multi-organizzazione (per gruppi aziendali)

---

## Piani e prezzi

> I prezzi sono da definire. Di seguito la struttura delle funzionalità per piano.

### Base
Ideale per piccole realtà che vogliono uscire dall'Excel.
- ✅ Ticket illimitati
- ✅ Tecnici, anagrafiche, clienti diretti
- ✅ Dashboard e statistiche
- ✅ Export Excel
- ❌ Magazzino
- ❌ Listini, Servizi, Contratti
- ❌ Funnel vendite
- ❌ Calendario
- ❌ Contabilità
- 👥 Max 5 utenti

### Professional ⭐ (consigliato)
Per PMI che vogliono un gestionale completo.
- ✅ Tutto il piano Base
- ✅ Magazzino
- ✅ Listini prezzi
- ✅ Catalogo servizi e contratti
- ✅ Funnel vendite
- ✅ Calendario
- ❌ Contabilità
- 👥 Max 15 utenti

### Enterprise
Per strutture complesse con esigenze avanzate.
- ✅ Tutto il piano Professional
- ✅ Contabilità completa
- ✅ Utenti illimitati
- ✅ Supporto dedicato
- ✅ Onboarding personalizzato

---

## Messaggi chiave (copy)

### Headline principale
> **Dimentica l'Excel. Gestisci la tua assistenza tecnica come un pro.**

### Subheadline
> Morpheus Hub è il gestionale web per aziende di assistenza tecnica. Ticket, tecnici, clienti, magazzino e contabilità — tutto in un'unica piattaforma.

### Proof points
- "Da 0 a operativo in pochi minuti"
- "Accesso da qualsiasi dispositivo, nessuna installazione"
- "I tuoi dati, sul tuo server" *(se offri opzione on-premise)*
- "Importa i dati dal tuo Excel esistente"
- "Semaforo SLA: non perdere mai una scadenza"

---

## Struttura del sito

### Homepage (landing page)
1. **Hero** — headline, subheadline, CTA "Prova gratis" / "Richiedi una demo"
2. **Problema** — "Stai ancora usando Excel?" — sezione empatica
3. **Soluzione** — overview visiva della piattaforma (screenshot/mockup)
4. **Funzionalità** — 6 feature card principali con icone
5. **Piani e prezzi** — tabella comparativa dei 3 piani
6. **Social proof** — citazioni clienti / loghi aziende (da aggiungere)
7. **FAQ** — domande frequenti
8. **CTA finale** — "Inizia oggi"
9. **Footer** — link Privacy Policy, Cookie Policy, contatti

### Pagine aggiuntive
- `/features` — dettaglio funzionalità
- `/pricing` — pagina prezzi dedicata
- `/privacy-policy` — informativa privacy
- `/cookie-policy` — cookie policy
- `/contatti` — form di contatto / richiesta demo

---

## Identità visiva

- **Nome:** Morpheus Hub
- **Dominio:** morpheushub.cloud
- **Tono:** professionale ma accessibile, moderno, diretto
- **Stile attuale app:** Tailwind CSS, palette blu (#2563EB) come colore primario, bianco/grigio chiari, arrotondamenti generosi (rounded-xl), font system
- **Suggerimento:** sito con sfondo scuro (dark hero) per distinguersi dall'app che ha sfondo chiaro

---

## Stack tecnico suggerito per il sito

| Opzione | Pro | Contro |
|---|---|---|
| **Astro + Tailwind** | Statico, velocissimo, SEO ottimo | Richiede sviluppo |
| **Next.js** | Flessibile, facile aggiungere form/API | Più pesante |
| **WordPress** | Facile gestione contenuti | Meno performante |
| **Webflow / Framer** | No-code, bello subito | Costo mensile, hosting esterno |

**Raccomandazione:** Astro + Tailwind CSS, servito come container statico nginx su Docker — leggero, veloce, zero dipendenze runtime.

---

## Container Docker (proposta)

```yaml
# Aggiungere al docker-compose.yml esistente:
website:
  build: ./website
  ports:
    - "80:80"      # oppure gestito da reverse proxy
  restart: unless-stopped
```

```
website/
├── Dockerfile          # nginx alpine che serve dist/
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── features.astro
│   │   └── pricing.astro
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── Pricing.astro
│   │   └── Footer.astro
│   └── layouts/
│       └── Base.astro
└── public/
    └── (immagini, favicon, og-image)
```

---

## CTA e conversione

- **Pulsante primario:** "Inizia gratis" o "Richiedi una demo" → mailto o form
- **Pulsante secondario:** "Accedi all'app" → `https://app.morpheushub.cloud`
- **Lead magnet opzionale:** "Scarica il template Excel gratuito per la gestione interventi" (per intercettare chi ancora usa Excel)

---

*Documento creato: marzo 2026*
*Morpheus Hub S.r.l.*
