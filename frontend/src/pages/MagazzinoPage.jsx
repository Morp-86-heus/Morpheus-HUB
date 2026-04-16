import { useState, useEffect } from 'react'
import { magazzinoApi, lookupApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-gray-600 mb-1"

function ArticoloForm({ initial, onSave, onCancel }) {
  const [commitenti, setCommitenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [clientiDiretti, setClientiDiretti] = useState([])
  const [form, setForm] = useState({
    commitente: '', cliente: '', categoria: '',
    marca: '', modello: '', seriale: '', cespite: '',
    descrizione: '', unita_misura: 'pz',
    quantita_disponibile: 0, quantita_minima: 0,
    fornitore: '', note: '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const isSerializzato = !!(form.seriale?.trim() || form.cespite?.trim())

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if ((k === 'seriale' || k === 'cespite') && (next.seriale?.trim() || next.cespite?.trim())) {
      next.quantita_disponibile = 1
    }
    return next
  })

  useEffect(() => {
    lookupApi.commitenti().then(r => setCommitenti(r.data))
    axios.get('/api/clienti-diretti').then(r => setClientiDiretti(r.data))
  }, [])

  useEffect(() => {
    if (form.commitente) {
      lookupApi.clienti(form.commitente).then(r => setClienti(r.data))
    } else {
      setClienti([])
    }
  }, [form.commitente])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.commitente || !form.cliente || !form.descrizione.trim()) {
      setErr('Committente, cliente e descrizione sono obbligatori')
      return
    }
    if (!form.seriale?.trim() && !form.cespite?.trim()) {
      setErr('Inserire almeno un Seriale o un Cespite')
      return
    }
    setSaving(true)
    try {
      await onSave({
        ...form,
        seriale: form.seriale?.trim() || null,
        cespite: form.cespite?.trim() || null,
        quantita_disponibile: parseInt(form.quantita_disponibile) || 0,
        quantita_minima: parseInt(form.quantita_minima) || 0,
      })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Errore salvataggio')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Committente + Cliente */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Committente *</label>
          <select className={inputCls} value={form.commitente} onChange={e => { set('commitente', e.target.value); set('cliente', '') }} disabled={!!initial?.id}>
            <option value="">— seleziona —</option>
            {commitenti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Cliente *</label>
          <select className={inputCls} value={form.cliente} onChange={e => set('cliente', e.target.value)} disabled={!!initial?.id}>
            <option value="">— seleziona —</option>
            {clienti.length > 0 && (
              <optgroup label="Clienti per committente">
                {clienti.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </optgroup>
            )}
            {clientiDiretti.length > 0 && (
              <optgroup label="Clienti Diretti">
                {clientiDiretti.map(c => <option key={`cd-${c.id}`} value={c.ragione_sociale}>{c.ragione_sociale}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className={labelCls}>Categoria</label>
        <input type="text" className={inputCls} value={form.categoria || ''} onChange={e => set('categoria', e.target.value)} placeholder="es. Stampanti, Monitor, Ricambi" />
      </div>

      {/* Marca + Modello */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Marca</label>
          <input type="text" className={inputCls} value={form.marca || ''} onChange={e => set('marca', e.target.value)} placeholder="es. HP, Dell, Canon" />
        </div>
        <div>
          <label className={labelCls}>Modello</label>
          <input type="text" className={inputCls} value={form.modello || ''} onChange={e => set('modello', e.target.value)} placeholder="es. LaserJet 1022" />
        </div>
      </div>

      {/* Seriale + Cespite */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Seriale <span className="text-gray-400">(almeno uno tra seriale/cespite)</span></label>
          <input type="text" className={inputCls} value={form.seriale || ''} onChange={e => set('seriale', e.target.value)} placeholder="Numero di serie" />
        </div>
        <div>
          <label className={labelCls}>Cespite</label>
          <input type="text" className={inputCls} value={form.cespite || ''} onChange={e => set('cespite', e.target.value)} placeholder="N° cespite aziendale" />
        </div>
      </div>

      {/* Descrizione */}
      <div>
        <label className={labelCls}>Descrizione *</label>
        <input type="text" className={inputCls} value={form.descrizione} onChange={e => set('descrizione', e.target.value)} placeholder="Descrizione breve dell'articolo" />
      </div>

      {/* UM + Qtà iniziale + Qtà minima */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>U.M.</label>
          <input type="text" className={inputCls} value={form.unita_misura || ''} onChange={e => set('unita_misura', e.target.value)} placeholder="pz" />
        </div>
        <div>
          <label className={labelCls}>Qtà iniziale</label>
          <input
            type="number" min="0" className={inputCls}
            value={isSerializzato ? 1 : form.quantita_disponibile}
            onChange={e => set('quantita_disponibile', e.target.value)}
            disabled={!!initial?.id || isSerializzato}
            title={isSerializzato ? 'Articolo serializzato: quantità fissa a 1' : undefined}
          />
          {isSerializzato && !initial?.id && (
            <p className="text-xs text-gray-400 mt-1">Articolo con seriale/cespite: quantità bloccata a 1</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Qtà minima</label>
          <input type="number" min="0" className={inputCls} value={form.quantita_minima || ''} onChange={e => set('quantita_minima', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Fornitore */}
      <div>
        <label className={labelCls}>Fornitore</label>
        <input type="text" className={inputCls} value={form.fornitore || ''} onChange={e => set('fornitore', e.target.value)} />
      </div>

      {/* Note */}
      <div>
        <label className={labelCls}>Note</label>
        <textarea rows={2} className={inputCls} value={form.note || ''} onChange={e => set('note', e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Salvo…' : 'Salva'}
        </button>
      </div>
    </form>
  )
}

function MovimentoForm({ articolo, onSave, onCancel }) {
  const isGuasti = articolo.categoria === 'Gestione Guasti'
  const isSerializzato = !!(articolo.seriale || articolo.cespite)
  const tipiDisponibili = isSerializzato ? ['carico', 'scarico'] : ['carico', 'scarico', 'rettifica']
  const [form, setForm] = useState({ tipo: 'carico', quantita: 1, note: '' })
  const [rimettiInGiacenza, setRimettiInGiacenza] = useState(false)
  const [nuovaCategoria, setNuovaCategoria] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (rimettiInGiacenza) {
      setSaving(true)
      try {
        await onSave({
          rimetti_in_giacenza: true,
          nuova_categoria: nuovaCategoria.trim() || null,
          note: form.note || null,
        })
      } catch (ex) {
        setErr(ex.response?.data?.detail || 'Errore salvataggio')
        setSaving(false)
      }
      return
    }
    const qty = isSerializzato ? 1 : parseInt(form.quantita)
    if (!qty || qty < 0) { setErr('Quantità non valida'); return }
    setSaving(true)
    try {
      await onSave({ tipo: form.tipo, quantita: qty, note: form.note || null })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Errore salvataggio')
      setSaving(false)
    }
  }

  const tipoColors = {
    carico: 'bg-green-100 text-green-700 border-green-300',
    scarico: 'bg-red-100 text-red-700 border-red-300',
    rettifica: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-500">{articolo.commitente} → <span className="font-medium text-gray-700">{articolo.cliente}</span></p>
        <p className="font-medium text-gray-800 mt-0.5">{[articolo.marca, articolo.modello].filter(Boolean).join(' ') || articolo.descrizione}</p>
        <p className="text-gray-500 mt-1">Giacenza attuale: <span className="font-semibold text-gray-800">{articolo.quantita_disponibile} {articolo.unita_misura}</span></p>
      </div>

      {/* Opzione rimetti in giacenza — solo per articoli in Gestione Guasti */}
      {isGuasti && (
        <label className="flex items-start gap-3 p-3 border border-orange-200 bg-orange-50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={rimettiInGiacenza}
            onChange={e => setRimettiInGiacenza(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <div>
            <p className="text-sm font-medium text-orange-800">Rimetti in giacenza</p>
            <p className="text-xs text-orange-600 mt-0.5">Sposta questo articolo negli articoli in giacenza. Se presente, verrà registrato uno scarico dalla sezione Gestione Guasti.</p>
          </div>
        </label>
      )}

      {/* Nuova categoria (visibile solo se rimetti in giacenza attivo) */}
      {isGuasti && rimettiInGiacenza && (
        <div>
          <label className={labelCls}>Nuova categoria <span className="text-gray-400">(opzionale)</span></label>
          <input
            type="text"
            className={inputCls}
            value={nuovaCategoria}
            onChange={e => setNuovaCategoria(e.target.value)}
            placeholder="es. Stampanti, Monitor, Ricambi…"
          />
        </div>
      )}

      {/* Campi movimento normali — nascosti quando rimetti in giacenza */}
      {!rimettiInGiacenza && (
        <>
          <div>
            <label className={labelCls}>Tipo movimento</label>
            <div className="flex gap-2">
              {tipiDisponibili.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('tipo', t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${form.tipo === t ? tipoColors[t] : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {isSerializzato ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
              <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {form.tipo === 'scarico'
                ? <span>Quantità: <strong>1</strong> — l'articolo verrà <span className="text-red-600 font-medium">rimosso</span> dal magazzino</span>
                : <span>Quantità: <strong>1</strong> — articolo serializzato</span>
              }
            </div>
          ) : (
            <div>
              <label className={labelCls}>{form.tipo === 'rettifica' ? 'Nuova giacenza assoluta' : 'Quantità'}</label>
              <input type="number" min="0" className={inputCls} value={form.quantita} onChange={e => set('quantita', e.target.value)} />
            </div>
          )}
        </>
      )}

      <div>
        <label className={labelCls}>Note</label>
        <textarea rows={2} className={inputCls} value={form.note} onChange={e => set('note', e.target.value)} placeholder="es. Acquisto fornitore, Utilizzo intervento #1234" />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
        <button
          type="submit"
          disabled={saving}
          className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${rimettiInGiacenza ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {saving ? 'Salvo…' : rimettiInGiacenza ? 'Rimetti in giacenza' : 'Registra movimento'}
        </button>
      </div>
    </form>
  )
}

function StockBadge({ articolo }) {
  const { quantita_disponibile: qty, quantita_minima: min } = articolo
  if (qty <= 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Esaurito</span>
  if (min && qty <= min) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Sotto minimo</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Disponibile</span>
}

/* ─── DDT ─────────────────────────────────────────────────────────────────── */
function printDDT(articoli, form) {
  const rows = articoli.map((a, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><strong>${a.descrizione}</strong>${a.marca || a.modello ? `<div style="font-size:10px;color:#555">${[a.marca, a.modello].filter(Boolean).join(' ')}</div>` : ''}</td>
      <td style="font-family:monospace;font-size:11px">${a.seriale || '—'}</td>
      <td style="font-family:monospace;font-size:11px">${a.cespite || '—'}</td>
      <td style="text-align:center">${a.quantita_disponibile}</td>
      <td style="font-size:11px;color:#555">${a.cliente || '—'}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>DDT ${form.nr_ddt ? '#' + form.nr_ddt : ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
  h1 { font-size: 20px; margin-bottom: 2px; }
  .subtitle { color: #555; font-size: 12px; margin-bottom: 24px; }
  .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; }
  .box-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-bottom: 6px; }
  .box-value { font-size: 13px; font-weight: 600; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .field label { font-size: 10px; color: #888; display: block; margin-bottom: 2px; text-transform: uppercase; }
  .field span { font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 10px; border: 1px solid #d1d5db; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .note-box { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px; min-height: 48px; font-size: 12px; white-space: pre-wrap; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
  .sign-line { border-top: 1px solid #aaa; padding-top: 6px; font-size: 10px; color: #888; text-align: center; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; color: #9ca3af; font-size: 10px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>Documento di Trasporto</h1>
  <div class="subtitle">${form.nr_ddt ? `DDT N° <strong>${form.nr_ddt}</strong> &nbsp;·&nbsp; ` : ''}Data: <strong>${form.data || '—'}</strong></div>

  <div class="header-grid">
    <div class="box">
      <div class="box-title">Committente / Destinatario</div>
      <div class="box-value">${form.committente || '—'}</div>
    </div>
    <div class="box">
      <div class="box-title">Causale trasporto</div>
      <div class="box-value">${form.causale || '—'}</div>
      ${form.vettore ? `<div style="margin-top:6px;font-size:11px;color:#555">Vettore: <strong>${form.vettore}</strong></div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Descrizione</th>
        <th style="width:130px">Seriale</th>
        <th style="width:110px">Cespite</th>
        <th style="width:50px;text-align:center">Qtà</th>
        <th style="width:120px">Cliente</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${form.note ? `<div style="margin-bottom:16px"><div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#888;margin-bottom:4px">Note</div><div class="note-box">${form.note}</div></div>` : ''}

  <div class="signatures">
    <div><div class="sign-line">Firma mittente</div></div>
    <div><div class="sign-line">Firma destinatario / vettore</div></div>
  </div>

  <div class="footer">
    <span>${form.committente || ''} — Articoli ritirati</span>
    <span>Generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
  </div>
</body>
</html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

function DDTModal({ articoli, committente, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    nr_ddt: '',
    data: today,
    causale: 'Reso merce per riparazione / assistenza',
    vettore: '',
    note: '',
    committente,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const lbl = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-800">Crea DDT — {committente}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Numero + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>N° DDT</label>
              <input type="text" className={inp} value={form.nr_ddt} onChange={e => set('nr_ddt', e.target.value)} placeholder="es. 001/2025" />
            </div>
            <div>
              <label className={lbl}>Data</label>
              <input type="date" className={inp} value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
          </div>

          {/* Causale */}
          <div>
            <label className={lbl}>Causale trasporto</label>
            <input type="text" className={inp} value={form.causale} onChange={e => set('causale', e.target.value)} />
          </div>

          {/* Vettore */}
          <div>
            <label className={lbl}>Vettore <span className="text-gray-400">(opzionale)</span></label>
            <input type="text" className={inp} value={form.vettore} onChange={e => set('vettore', e.target.value)} placeholder="es. Corriere SDA, ritiro diretto…" />
          </div>

          {/* Anteprima articoli */}
          <div>
            <label className={lbl}>Articoli selezionati ({articoli.length})</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Descrizione</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">S/N</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articoli.map(a => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 text-gray-800">
                        {[a.marca, a.modello].filter(Boolean).join(' ') || a.descrizione}
                        {(a.marca || a.modello) && <div className="text-gray-400">{a.descrizione}</div>}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">{a.seriale || a.cespite || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{a.cliente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={lbl}>Note</label>
            <textarea rows={2} className={inp} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Annotazioni aggiuntive…" />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
            <button
              type="button"
              onClick={() => printDDT(articoli, form)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Stampa / PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SpostaModal({ articolo, sottoMagazzini, onConfirm, onCancel }) {
  const [destinazione, setDestinazione] = useState(articolo.sotto_magazzino_id ? String(articolo.sotto_magazzino_id) : '__principale__')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const corrente = articolo.sotto_magazzino_id ? String(articolo.sotto_magazzino_id) : '__principale__'
    if (destinazione === corrente) { setErr('Seleziona una destinazione diversa da quella attuale'); return }
    setSaving(true)
    try {
      const sotto_magazzino_id = destinazione === '__principale__' ? null : parseInt(destinazione)
      await onConfirm({ sotto_magazzino_id, note: note.trim() || null })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Errore spostamento')
      setSaving(false)
    }
  }

  const nome = [articolo.marca, articolo.modello].filter(Boolean).join(' ') || articolo.descrizione
  const posizioneAttuale = articolo.sotto_magazzino ? articolo.sotto_magazzino.nome : 'Magazzino principale'

  return (
    <Modal title="Sposta articolo" onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-gray-800">{nome}</p>
          {articolo.seriale && <p className="text-xs text-gray-400 mt-0.5">S/N: {articolo.seriale}</p>}
          <p className="text-xs text-gray-500 mt-1">Posizione attuale: <span className="font-medium text-purple-700">{posizioneAttuale}</span></p>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Destinazione</label>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${destinazione === '__principale__' ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="dest" value="__principale__" checked={destinazione === '__principale__'} onChange={() => setDestinazione('__principale__')} className="accent-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-800">Magazzino principale</p>
              </div>
            </label>
            {sottoMagazzini.map(s => (
              <label key={s.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${destinazione === String(s.id) ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="dest" value={String(s.id)} checked={destinazione === String(s.id)} onChange={() => setDestinazione(String(s.id))} className="accent-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.nome}</p>
                  {s.descrizione && <p className="text-xs text-gray-400">{s.descrizione}</p>}
                </div>
              </label>
            ))}
            {sottoMagazzini.length === 0 && (
              <p className="text-xs text-gray-400 italic px-1">Nessuna ubicazione configurata per {articolo.commitente}. Creala prima dalla barra filtri.</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Note <span className="text-gray-400">(opzionale)</span></label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="es. Affidato a Germano per intervento" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
          <button type="submit" disabled={saving || sottoMagazzini.length === 0 && destinazione !== '__principale__'} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {saving ? 'Sposto…' : 'Sposta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SottoMagazziniManagerModal({ commitente, sottoMagazzini: initialList, onClose }) {
  const [list, setList] = useState(initialList)
  const [editItem, setEditItem] = useState(null)  // null=nuovo, obj=modifica
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', descrizione: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [deleteItem, setDeleteItem] = useState(null)

  const reload = async () => {
    const res = await magazzinoApi.sottoMagazzini(commitente)
    setList(res.data)
  }

  const openNew = () => { setEditItem(null); setForm({ nome: '', descrizione: '' }); setErr(''); setShowForm(true) }
  const openEdit = (s) => { setEditItem(s); setForm({ nome: s.nome, descrizione: s.descrizione || '' }); setErr(''); setShowForm(true) }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) { setErr('Il nome è obbligatorio'); return }
    setSaving(true)
    try {
      if (editItem) {
        await magazzinoApi.updateSottoMagazzino(editItem.id, { nome: form.nome.trim(), descrizione: form.descrizione.trim() || null })
      } else {
        await magazzinoApi.createSottoMagazzino({ nome: form.nome.trim(), descrizione: form.descrizione.trim() || null, commitente })
      }
      setShowForm(false)
      await reload()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (s) => {
    await magazzinoApi.deleteSottoMagazzino(s.id)
    setDeleteItem(null)
    await reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Ubicazioni — {commitente}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gestisci i depositi e carkit per questo committente</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {list.length === 0 && !showForm && (
            <p className="text-sm text-gray-400 italic text-center py-4">Nessuna ubicazione configurata</p>
          )}
          {list.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-3 border border-gray-200 rounded-lg">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{s.nome}</p>
                {s.descrizione && <p className="text-xs text-gray-400 truncate">{s.descrizione}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifica">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setDeleteItem(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Elimina">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}

          {showForm && (
            <form onSubmit={submit} className="border border-purple-200 bg-purple-50 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-purple-700">{editItem ? 'Modifica ubicazione' : 'Nuova ubicazione'}</p>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome (es. Carkit Germano, Deposito Roma)"
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                value={form.descrizione}
                onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                placeholder="Descrizione opzionale"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
                <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {saving ? 'Salvo…' : 'Salva'}
                </button>
              </div>
            </form>
          )}

          {deleteItem && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
              <p className="text-sm text-red-700">Eliminare <strong>{deleteItem.nome}</strong>? Gli articoli al suo interno torneranno al magazzino principale.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteItem(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
                <button onClick={() => confirmDelete(deleteItem)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Elimina</button>
              </div>
            </div>
          )}

          {!showForm && (
            <button
              onClick={openNew}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-600 border border-dashed border-purple-300 rounded-lg hover:bg-purple-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Aggiungi ubicazione
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MagazzinoPage() {
  const { can } = useAuth()
  const canViewArticoli   = can('magazzino.articoli.view')
  const canEditArticoli   = can('magazzino.articoli.edit')
  const canDeleteArticoli = can('magazzino.articoli.delete')
  const isAdmin = canEditArticoli  // alias per compatibilità con i controlli esistenti (nuovo articolo, sposta in ritirati)

  const [activeTab, setActiveTab] = useState('giacenza') // 'giacenza' | 'ritirati' | 'log'
  const [articoli, setArticoli] = useState([])
  const [commitenti, setCommitenti] = useState([])
  const [filterCommitente, setFilterCommitente] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const [search, setSearch] = useState('')
  const [sottoMinimo, setSottoMinimo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [expandedCommitenti, setExpandedCommitenti] = useState({})

  // ── Log movimenti ──
  const [logItems, setLogItems] = useState([])
  const [logTotal, setLogTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logLoading, setLogLoading] = useState(false)
  const [logSearch, setLogSearch] = useState('')
  const [logTipo, setLogTipo] = useState('')
  const [logCommitente, setLogCommitente] = useState('')

  const [newArticolo, setNewArticolo] = useState(false)
  const [editArticolo, setEditArticolo] = useState(null)
  const [deleteArticolo, setDeleteArticolo] = useState(null)
  const [movimentoArticolo, setMovimentoArticolo] = useState(null)
  const [spostaArticolo, setSpostaArticolo] = useState(null)
  const [sottoMagazzini, setSottoMagazzini] = useState([])
  const [filterSottoMagazzino, setFilterSottoMagazzino] = useState('')
  const [sottoMagazziniModal, setSottoMagazziniModal] = useState(null)

  // ── Vista card / tabella ──
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('magazzino_viewMode') || 'card') // 'card' | 'table'

  // ── Ordinamento tabella ──
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  // ── Filtri avanzati tabella ──
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterStock, setFilterStock] = useState('')
  const [filterFornitore, setFilterFornitore] = useState('')

  // ── Selezione DDT ──
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [ddtModal, setDdtModal] = useState(false)

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const selectAll = () => setSelectedIds(new Set(articoliFiltrati.map(a => a.id)))
  const clearSelection = () => setSelectedIds(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterCommitente) params.commitente = filterCommitente
      if (filterCliente) params.cliente = filterCliente
      if (search) params.search = search
      if (sottoMinimo) params.sotto_minimo = true
      const [aRes, cRes, smRes] = await Promise.allSettled([
        magazzinoApi.list(params),
        lookupApi.commitenti(),
        magazzinoApi.sottoMagazzini(),
      ])
      if (aRes.status === 'fulfilled') {
        setArticoli(aRes.value.data)
        if (selected) {
          const aggiornato = aRes.value.data.find(a => a.id === selected.id)
          setSelected(aggiornato || null)
        }
      } else {
        console.error('Errore caricamento articoli:', aRes.reason)
      }
      if (cRes.status === 'fulfilled') setCommitenti(cRes.value.data.map(c => c.nome ?? c))
      if (smRes.status === 'fulfilled') setSottoMagazzini(smRes.value.data)
    } catch (e) {
      console.error('Errore caricamento magazzino:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterCommitente, filterCliente, search, sottoMinimo])

  const loadLog = async (page = 1) => {
    setLogLoading(true)
    try {
      const params = { page, page_size: 50 }
      if (logSearch) params.search = logSearch
      if (logTipo) params.tipo = logTipo
      if (logCommitente) params.commitente = logCommitente
      const res = await magazzinoApi.movimenti(params)
      setLogItems(res.data.items)
      setLogTotal(res.data.total)
      setLogPage(page)
    } catch (e) {
      console.error('Errore caricamento log:', e)
    } finally {
      setLogLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'log') loadLog(1)
    setSelectedIds(new Set())
    setSortField('')
    setSortDir('asc')
    setFilterCategoria('')
    setFilterStock('')
    setFilterFornitore('')
    setShowAdvancedFilters(false)
  }, [activeTab])

  // Filtra per tab attivo + ubicazione
  const articoliFiltrati = articoli.filter(a => {
    if (activeTab === 'ritirati' ? a.categoria !== 'Gestione Guasti' : a.categoria === 'Gestione Guasti') return false
    if (filterSottoMagazzino === '__principale__') return !a.sotto_magazzino_id
    if (filterSottoMagazzino) return String(a.sotto_magazzino_id) === filterSottoMagazzino
    return true
  })

  // Categorie e fornitori per i filtri avanzati
  const categorieDisponibili = [...new Set(articoliFiltrati.map(a => a.categoria).filter(Boolean))].sort()
  const fornitoriDisponibili = [...new Set(articoliFiltrati.map(a => a.fornitore).filter(Boolean))].sort()

  // Articoli per la tabella: filtri avanzati + ordinamento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const articoliTabella = [...articoliFiltrati]
    .filter(a => {
      if (filterCategoria && a.categoria !== filterCategoria) return false
      if (filterFornitore && a.fornitore !== filterFornitore) return false
      if (filterStock === 'disponibile' && a.quantita_disponibile <= 0) return false
      if (filterStock === 'sotto_minimo' && !(a.quantita_minima && a.quantita_disponibile > 0 && a.quantita_disponibile <= a.quantita_minima)) return false
      if (filterStock === 'esaurito' && a.quantita_disponibile > 0) return false
      return true
    })
    .sort((a, b) => {
      if (!sortField) return 0
      const va = a[sortField] ?? ''
      const vb = b[sortField] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'it')
      return sortDir === 'asc' ? cmp : -cmp
    })

  const hasAdvancedFilters = !!(filterCategoria || filterStock || filterFornitore)

  // Articoli selezionati (oggetti completi, solo ritirati)
  const articoliSelezionati = articoliFiltrati.filter(a => selectedIds.has(a.id))
  const commitenteSelezionato = articoliSelezionati[0]?.commitente || filterCommitente || ''

  // Struttura: { commitente: { cliente: [articoli] } }
  const grouped = articoliFiltrati.reduce((acc, a) => {
    if (!acc[a.commitente]) acc[a.commitente] = {}
    if (!acc[a.commitente][a.cliente]) acc[a.commitente][a.cliente] = []
    acc[a.commitente][a.cliente].push(a)
    return acc
  }, {})

  const toggleCommitente = (c) => setExpandedCommitenti(prev => ({ ...prev, [c]: !prev[c] }))

  const tipoColor = { carico: 'text-green-600', scarico: 'text-red-600', rettifica: 'text-yellow-600', trasferimento: 'text-purple-600' }
  const tipoIcon = { carico: '+', scarico: '−', rettifica: '≈', trasferimento: '⇄' }

  // Clienti disponibili per il filtro (dal committente selezionato, solo tab attivo)
  const clientiFilter = filterCommitente
    ? [...new Set(articoliFiltrati.filter(a => a.commitente === filterCommitente).map(a => a.cliente))].sort()
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Magazzino</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestione articoli e giacenze per committente / cliente</p>
        </div>
        {isAdmin && activeTab === 'giacenza' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSottoMagazziniModal(filterCommitente || '__pick__')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ubicazioni
            </button>
            <button
              onClick={() => setNewArticolo(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo articolo
            </button>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('giacenza'); setFilterCommitente(''); setFilterCliente(''); setSottoMinimo(false) }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'giacenza'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Articoli in giacenza
        </button>
        <button
          onClick={() => { setActiveTab('ritirati'); setFilterCommitente(''); setFilterCliente(''); setSottoMinimo(false) }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ritirati'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Articoli ritirati
          {activeTab !== 'ritirati' && articoli.filter(a => a.categoria === 'Gestione Guasti').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-600">
              {articoli.filter(a => a.categoria === 'Gestione Guasti').length}
            </span>
          )}
        </button>
        {can('view_log') && (
          <button
            onClick={() => { setActiveTab('log'); setLogSearch(''); setLogTipo(''); setLogCommitente('') }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-gray-700 text-gray-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Log movimenti
          </button>
        )}
      </div>

      {/* Barra selezione DDT — tab ritirati */}
      {activeTab === 'ritirati' && articoliFiltrati.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => selectedIds.size === articoliFiltrati.length ? clearSelection() : selectAll()}
            className="text-sm text-blue-600 hover:underline"
          >
            {selectedIds.size === articoliFiltrati.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500">{selectedIds.size} selezionati</span>
              <button
                onClick={() => setDdtModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Crea DDT
              </button>
              <button onClick={clearSelection} className="text-sm text-gray-400 hover:text-gray-600">Annulla</button>
            </>
          )}
        </div>
      )}

      {/* Banner tab ritirati */}
      {activeTab === 'ritirati' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Parti guaste fisicamente ritirate durante gli interventi. Caricate automaticamente alla chiusura del ticket.
        </div>
      )}

      {/* ── Vista Log movimenti ── */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          {/* Filtri log */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Cerca articolo, seriale, note…"
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <select
              value={logTipo}
              onChange={e => setLogTipo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti i tipi</option>
              <option value="carico">Carico</option>
              <option value="scarico">Scarico</option>
              <option value="rettifica">Rettifica</option>
            </select>
            <select
              value={logCommitente}
              onChange={e => setLogCommitente(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tutti i committenti</option>
              {commitenti.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-gray-400 ml-auto">{logTotal} movimenti totali</span>
          </div>

          {/* Tabella log */}
          {logLoading ? (
            <p className="text-sm text-gray-400">Caricamento…</p>
          ) : logItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nessun movimento trovato.</p>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Articolo</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Committente / Cliente</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Qtà</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utente</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logItems.map(m => {
                      const tipoCls = { carico: 'bg-green-100 text-green-700', scarico: 'bg-red-100 text-red-700', rettifica: 'bg-yellow-100 text-yellow-700' }
                      const tipoSym = { carico: '+', scarico: '−', rettifica: '≈' }
                      return (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                            {m.created_at ? new Date(m.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tipoCls[m.tipo]}`}>
                              {tipoSym[m.tipo]} {m.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-800 truncate max-w-[180px]">
                              {[m.articolo_marca, m.articolo_modello].filter(Boolean).join(' ') || m.articolo_descrizione}
                            </p>
                            <div className="flex gap-2 mt-0.5 flex-wrap">
                              {m.articolo_categoria && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{m.articolo_categoria}</span>
                              )}
                              {m.articolo_seriale && (
                                <span className="text-xs text-gray-400 font-mono">S/N: {m.articolo_seriale}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">
                            <p>{m.articolo_commitente}</p>
                            <p className="text-gray-400">{m.articolo_cliente}</p>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-semibold text-gray-800">{m.quantita}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{m.creato_da_nome || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">{m.note || '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            {m.riferimento_ticket_id
                              ? <span className="text-xs font-mono text-blue-600">#{m.riferimento_ticket_id}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginazione log */}
              {logTotal > 50 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Pagina {logPage} di {Math.ceil(logTotal / 50)}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={logPage === 1}
                      onClick={() => loadLog(logPage - 1)}
                      className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >← Prec</button>
                    <button
                      disabled={logPage >= Math.ceil(logTotal / 50)}
                      onClick={() => loadLog(logPage + 1)}
                      className="px-3 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >Succ →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Filtri */}
      {activeTab !== 'log' && <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Cerca seriale, descrizione, fornitore…"
          value={search}
          onChange={e => { setSearch(e.target.value); setFilterCliente('') }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        {activeTab === 'giacenza' && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={sottoMinimo} onChange={e => setSottoMinimo(e.target.checked)} className="rounded" />
            Solo sotto minimo
          </label>
        )}
        {/* Filtri avanzati — solo vista tabella */}
        {viewMode === 'table' && (
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              showAdvancedFilters || hasAdvancedFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Filtri avanzati
            {hasAdvancedFilters && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />}
          </button>
        )}

        {/* Toggle card / tabella */}
        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => { setViewMode('card'); localStorage.setItem('magazzino_viewMode', 'card') }}
            title="Vista card"
            className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => { setViewMode('table'); localStorage.setItem('magazzino_viewMode', 'table') }}
            title="Vista tabella"
            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
            </svg>
          </button>
        </div>
      </div>}

      {/* Pannello filtri avanzati — solo vista tabella */}
      {activeTab !== 'log' && viewMode === 'table' && showAdvancedFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutte le categorie</option>
                {categorieDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fornitore</label>
              <select
                value={filterFornitore}
                onChange={e => setFilterFornitore(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti i fornitori</option>
                {fornitoriDisponibili.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stato giacenza</label>
              <select
                value={filterStock}
                onChange={e => setFilterStock(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti</option>
                <option value="disponibile">Disponibili</option>
                <option value="sotto_minimo">Sotto minimo</option>
                <option value="esaurito">Esauriti</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterCategoria(''); setFilterStock(''); setFilterFornitore('') }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                ✕ Reset filtri avanzati
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtro committente */}
      {activeTab !== 'log' && <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Committente:</span>
        <button
          onClick={() => { setFilterCommitente(''); setFilterCliente(''); setFilterSottoMagazzino('') }}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterCommitente === '' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Tutti
        </button>
        {commitenti.map(c => (
          <button
            key={c}
            onClick={() => { setFilterCommitente(c); setFilterCliente(''); setFilterSottoMagazzino('') }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterCommitente === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {c}
          </button>
        ))}
      </div>}

      {/* Filtro cliente (visibile solo se committente selezionato e ha più clienti) */}
      {activeTab !== 'log' && clientiFilter.length > 1 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cliente:</span>
          <button
            onClick={() => setFilterCliente('')}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterCliente === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Tutti
          </button>
          {clientiFilter.map(c => (
            <button
              key={c}
              onClick={() => setFilterCliente(c)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterCliente === c ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Filtro ubicazione + gestisci */}
      {activeTab === 'giacenza' && filterCommitente && (() => {
        const smCommitente = sottoMagazzini.filter(s => s.commitente === filterCommitente)
        if (smCommitente.length === 0 && !isAdmin) return null
        return (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Posizione:</span>
            <button
              onClick={() => setFilterSottoMagazzino('')}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterSottoMagazzino === '' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Tutti
            </button>
            <button
              onClick={() => setFilterSottoMagazzino('__principale__')}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterSottoMagazzino === '__principale__' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Magazzino principale
            </button>
            {smCommitente.map(s => (
              <button
                key={s.id}
                onClick={() => setFilterSottoMagazzino(String(s.id))}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${filterSottoMagazzino === String(s.id) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {s.nome}
              </button>
            ))}
          </div>
        )
      })()}

      {/* Contenuto articoli (nascosto nel tab log) */}
      {activeTab !== 'log' && !canViewArticoli ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Non hai il permesso di visualizzare gli articoli</p>
        </div>
      ) : activeTab !== 'log' && loading ? (
        <p className="text-sm text-gray-400">Caricamento…</p>
      ) : activeTab !== 'log' && articoliFiltrati.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm">{activeTab === 'ritirati' ? 'Nessun articolo ritirato presente' : 'Nessun articolo trovato'}</p>
        </div>

      ) : activeTab !== 'log' && viewMode === 'table' ? (
        /* ── Vista tabella ── */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {hasAdvancedFilters && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-center gap-3">
              <span>Filtri attivi: {[filterCategoria, filterFornitore, filterStock && { disponibile: 'Disponibili', sotto_minimo: 'Sotto minimo', esaurito: 'Esauriti' }[filterStock]].filter(Boolean).join(' · ')}</span>
              <span className="text-blue-500">{articoliTabella.length} di {articoliFiltrati.length} articoli</span>
            </div>
          )}
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {(() => {
                const thSort = (label, field, align = 'left') => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`px-3 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors ${
                      sortField === field ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
                    }`}
                  >
                    {label}
                    {sortField === field && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                )
                return (
                  <tr>
                    {activeTab === 'ritirati' && (
                      <th className="px-3 py-2.5 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === articoliFiltrati.length && articoliFiltrati.length > 0}
                          onChange={() => selectedIds.size === articoliFiltrati.length ? clearSelection() : selectAll()}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        />
                      </th>
                    )}
                    {thSort('Committente', 'commitente')}
                    {thSort('Cliente', 'cliente')}
                    {thSort('Categoria', 'categoria')}
                    {thSort('Articolo', 'descrizione')}
                    {thSort('Seriale', 'seriale')}
                    {thSort('Cespite', 'cespite')}
                    {thSort('Giacenza', 'quantita_disponibile', 'center')}
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Azioni</th>
                  </tr>
                )
              })()}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articoliTabella.map(a => (
                <tr key={a.id} className={`hover:bg-gray-50 ${selectedIds.has(a.id) ? 'bg-indigo-50/40' : ''}`}>
                  {activeTab === 'ritirati' && (
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-xs text-gray-500">{a.commitente}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{a.cliente}</td>
                  <td className="px-3 py-2.5">
                    {a.categoria && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{a.categoria}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-800">{[a.marca, a.modello].filter(Boolean).join(' ') || a.descrizione}</p>
                    {(a.marca || a.modello) && <p className="text-xs text-gray-400">{a.descrizione}</p>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{a.seriale || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{a.cespite || '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-sm font-bold ${a.quantita_disponibile <= 0 ? 'text-red-600' : a.quantita_minima && a.quantita_disponibile <= a.quantita_minima ? 'text-orange-600' : 'text-gray-800'}`}>
                      {a.quantita_disponibile}
                    </span>
                    {a.quantita_minima > 0 && <span className="text-xs text-gray-400 ml-1">/ {a.quantita_minima}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {a.sotto_magazzino && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mb-1 inline-block">{a.sotto_magazzino.nome}</span>
                    )}
                    <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      {activeTab === 'giacenza' && isAdmin && (
                        <button onClick={async () => { await magazzinoApi.update(a.id, { categoria: 'Gestione Guasti' }); load() }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Sposta in ritirati">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v6m4-6v6" /></svg>
                        </button>
                      )}
                      {activeTab === 'giacenza' && isAdmin && (
                        <button onClick={() => setSpostaArticolo(a)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Sposta in ubicazione">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                      )}
                      <button onClick={() => setMovimentoArticolo(a)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Registra movimento">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                      </button>
                      {canEditArticoli && (
                          <button onClick={() => setEditArticolo(a)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifica">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                      )}
                      {canDeleteArticoli && (
                          <button onClick={() => setDeleteArticolo(a)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Elimina">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : activeTab !== 'log' && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([commitente, clientiMap]) => (
            <div key={commitente} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Header committente */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
                onClick={() => toggleCommitente(commitente)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800 text-sm">{commitente}</span>
                  <span className="text-xs text-gray-400">
                    {Object.keys(clientiMap).length} {Object.keys(clientiMap).length === 1 ? 'cliente' : 'clienti'} ·{' '}
                    {Object.values(clientiMap).reduce((s, arr) => s + arr.length, 0)} articoli
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedCommitenti[commitente] === false ? '-rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Clienti (visibili per default) */}
              {expandedCommitenti[commitente] !== false && (
                <div className="divide-y divide-gray-100">
                  {Object.entries(clientiMap).map(([cliente, items]) => (
                    <div key={cliente} className="px-4 py-3">
                      <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">{cliente}</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {items.map(a => (
                          <div
                            key={a.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${
                              selectedIds.has(a.id) ? 'border-indigo-400 ring-1 ring-indigo-300 bg-indigo-50/30' :
                              selected?.id === a.id ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200'
                            }`}
                            onClick={() => setSelected(selected?.id === a.id ? null : a)}
                          >
                            {/* Checkbox selezione DDT — solo tab ritirati */}
                            {activeTab === 'ritirati' && (
                              <div className="flex items-center gap-2 mb-2" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(a.id)}
                                  onChange={() => toggleSelect(a.id)}
                                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                />
                                <span className="text-xs text-gray-400">Seleziona per DDT</span>
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {a.categoria && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{a.categoria}</span>}
                                  <StockBadge articolo={a} />
                                  {a.sotto_magazzino && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                      {a.sotto_magazzino.nome}
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-800 text-sm mt-0.5">
                                  {[a.marca, a.modello].filter(Boolean).join(' ') || a.descrizione}
                                </p>
                                {(a.marca || a.modello) && <p className="text-xs text-gray-500 truncate">{a.descrizione}</p>}
                                <div className="flex gap-3 mt-1 flex-wrap">
                                  {a.seriale && <span className="text-xs text-gray-400">S/N: <span className="font-mono text-gray-600">{a.seriale}</span></span>}
                                  {a.cespite && <span className="text-xs text-gray-400">Cespite: <span className="font-mono text-gray-600">{a.cespite}</span></span>}
                                </div>
                                <div className="flex items-baseline gap-1 mt-1">
                                  <span className="text-xl font-bold text-gray-800">{a.quantita_disponibile}</span>
                                  <span className="text-xs text-gray-400">{a.unita_misura}</span>
                                  {a.quantita_minima > 0 && (
                                    <span className="text-xs text-gray-400 ml-1">/ min {a.quantita_minima}</span>
                                  )}
                                </div>
                                {a.fornitore && <p className="text-xs text-gray-400 mt-0.5">{a.fornitore}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                {activeTab === 'giacenza' && isAdmin && (
                                  <button
                                    onClick={async () => {
                                      await magazzinoApi.update(a.id, { categoria: 'Gestione Guasti' })
                                      load()
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                                    title="Sposta in articoli ritirati"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v6m4-6v6" />
                                    </svg>
                                  </button>
                                )}
                                {activeTab === 'giacenza' && isAdmin && (
                                  <button
                                    onClick={() => setSpostaArticolo(a)}
                                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                                    title="Sposta in ubicazione"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => setMovimentoArticolo(a)}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Registra movimento"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                  </svg>
                                </button>
                                {canEditArticoli && (
                                    <button
                                      onClick={() => setEditArticolo(a)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                      title="Modifica"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                )}
                                {canDeleteArticoli && (
                                    <button
                                      onClick={() => setDeleteArticolo(a)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                      title="Elimina"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                )}
                              </div>
                            </div>

                            {/* Storico movimenti espanso */}
                            {selected?.id === a.id && (
                              <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                                <p className="text-xs font-medium text-gray-500 mb-2">Ultimi movimenti</p>
                                {a.movimenti && a.movimenti.length > 0 ? (
                                  <div className="space-y-1 max-h-44 overflow-y-auto">
                                    {[...a.movimenti].reverse().slice(0, 20).map(m => (
                                      <div key={m.id} className="flex items-start justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                          <span className={`font-bold text-sm w-4 text-center ${tipoColor[m.tipo]}`}>{tipoIcon[m.tipo]}</span>
                                          <div>
                                            <span className={`font-medium ${tipoColor[m.tipo]}`}>
                                              {m.tipo === 'rettifica' ? `Rettifica → ${m.quantita}` : `${m.quantita} ${a.unita_misura}`}
                                            </span>
                                            {m.note && <p className="text-gray-400">{m.note}</p>}
                                          </div>
                                        </div>
                                        <span className="text-gray-300 shrink-0 ml-2">
                                          {new Date(m.created_at).toLocaleDateString('it-IT')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">Nessun movimento registrato</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuovo articolo */}
      {newArticolo && (
        <Modal title="Nuovo articolo" onClose={() => setNewArticolo(false)}>
          <ArticoloForm
            onSave={async (data) => { await magazzinoApi.create(data); setNewArticolo(false); load() }}
            onCancel={() => setNewArticolo(false)}
          />
        </Modal>
      )}

      {/* Modal: Modifica articolo */}
      {editArticolo && (
        <Modal title="Modifica articolo" onClose={() => setEditArticolo(null)}>
          <ArticoloForm
            initial={editArticolo}
            onSave={async (data) => { await magazzinoApi.update(editArticolo.id, data); setEditArticolo(null); load() }}
            onCancel={() => setEditArticolo(null)}
          />
        </Modal>
      )}

      {/* Modal: Elimina articolo */}
      {deleteArticolo && (
        <Modal title="Elimina articolo" onClose={() => setDeleteArticolo(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Eliminare <strong>{[deleteArticolo.marca, deleteArticolo.modello].filter(Boolean).join(' ') || deleteArticolo.descrizione}</strong> e tutto il suo storico movimenti?
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteArticolo(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
            <button
              onClick={async () => {
                await magazzinoApi.delete(deleteArticolo.id)
                setDeleteArticolo(null)
                if (selected?.id === deleteArticolo.id) setSelected(null)
                load()
              }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Elimina
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Registra movimento */}
      {movimentoArticolo && (
        <Modal title="Registra movimento" onClose={() => setMovimentoArticolo(null)}>
          <MovimentoForm
            articolo={movimentoArticolo}
            onSave={async (data) => {
              if (data.rimetti_in_giacenza) {
                // Aggiorna solo la categoria — la quantità rimane invariata
                await magazzinoApi.update(movimentoArticolo.id, {
                  categoria: data.nuova_categoria,
                  ...(data.note ? { note: data.note } : {}),
                })
              } else {
                await magazzinoApi.addMovimento(movimentoArticolo.id, data)
              }
              setMovimentoArticolo(null)
              load()
            }}
            onCancel={() => setMovimentoArticolo(null)}
          />
        </Modal>
      )}

      {/* Modal: Crea DDT */}
      {ddtModal && articoliSelezionati.length > 0 && (
        <DDTModal
          articoli={articoliSelezionati}
          committente={commitenteSelezionato}
          onClose={() => setDdtModal(false)}
        />
      )}

      {/* Modal: Sposta in ubicazione */}
      {spostaArticolo && (
        <SpostaModal
          articolo={spostaArticolo}
          sottoMagazzini={sottoMagazzini.filter(s => s.commitente === spostaArticolo.commitente)}
          onConfirm={async (data) => {
            await magazzinoApi.sposta(spostaArticolo.id, data)
            setSpostaArticolo(null)
            load()
          }}
          onCancel={() => setSpostaArticolo(null)}
        />
      )}

      {/* Modal: Gestisci ubicazioni */}
      {sottoMagazziniModal && sottoMagazziniModal !== '__pick__' && (
        <SottoMagazziniManagerModal
          commitente={sottoMagazziniModal}
          sottoMagazzini={sottoMagazzini.filter(s => s.commitente === sottoMagazziniModal)}
          onClose={() => { setSottoMagazziniModal(null); load() }}
        />
      )}
      {sottoMagazziniModal === '__pick__' && (
        <Modal title="Gestisci ubicazioni" onClose={() => setSottoMagazziniModal(null)}>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">Seleziona il committente da gestire:</p>
            <div className="grid grid-cols-2 gap-2">
              {commitenti.map(c => (
                <button
                  key={c}
                  onClick={() => setSottoMagazziniModal(c)}
                  className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 text-left transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
