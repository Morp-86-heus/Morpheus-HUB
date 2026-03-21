import { useState, useEffect, useRef, useCallback } from 'react'
import { ticketsApi, listiniApi, magazzinoApi } from '../api/client'

const ESITI = ['Risolto', 'Parzialmente risolto', 'Non risolto']
const TIPI_PARTE = ['BAD', 'DOA']

const ESITO_COLORS = {
  'Risolto': 'text-green-600',
  'Parzialmente risolto': 'text-yellow-600',
  'Non risolto': 'text-red-600',
}

/* ─── Riga singola parte ─────────────────────────────────────────────────────── */
function ParteRow({ parte, index, onChange, onRemove, ticket }) {
  const inp = "w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
  const lbl = "block text-xs text-gray-400 mb-1"

  const [articoliTrovati, setArticoliTrovati] = useState([])
  const [cercando, setCercando] = useState(false)
  const debounceRef = useRef(null)

  // Cerca in magazzino quando cambia il seriale del ricambio
  useEffect(() => {
    const seriale = parte.ricambio_seriale?.trim()
    if (!seriale || seriale.length < 2) { setArticoliTrovati([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCercando(true)
      try {
        const res = await magazzinoApi.cercaArticolo({
          seriale,
          ...(ticket?.commitente ? { commitente: ticket.commitente } : {}),
          ...(ticket?.cliente ? { cliente: ticket.cliente } : {}),
        })
        setArticoliTrovati(res.data)
      } catch { setArticoliTrovati([]) }
      finally { setCercando(false) }
    }, 400)
  }, [parte.ricambio_seriale])

  const collegaArticolo = (art) => {
    onChange(index, 'ricambio_articolo_id', art.id)
    onChange(index, 'ricambio_descrizione', art.descrizione)
    onChange(index, 'ricambio_modello', [art.marca, art.modello].filter(Boolean).join(' ') || art.descrizione)
    onChange(index, 'ricambio_seriale', art.seriale || parte.ricambio_seriale)
    setArticoliTrovati([])
  }

  const scollegaArticolo = () => {
    onChange(index, 'ricambio_articolo_id', null)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header riga */}
      <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ricambio #{index + 1}</span>
        <button type="button" onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 text-sm leading-none" title="Rimuovi">✕</button>
      </div>

      <div className="p-3 space-y-3">
        {/* — Parte guasta — */}
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Parte guasta</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={parte.parte_ritirata || false}
                  onChange={e => {
                    onChange(index, 'parte_ritirata', e.target.checked)
                    if (e.target.checked) onChange(index, 'parte_da_riparare', false)
                  }}
                  className="w-3.5 h-3.5 accent-orange-500"
                />
                <span className={parte.parte_ritirata ? 'text-orange-600 font-semibold' : ''}>
                  Parte ritirata → carico Gestione Guasti
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={parte.parte_da_riparare || false}
                  onChange={e => {
                    onChange(index, 'parte_da_riparare', e.target.checked)
                    if (e.target.checked) onChange(index, 'parte_ritirata', false)
                  }}
                  className="w-3.5 h-3.5 accent-blue-500"
                />
                <span className={parte.parte_da_riparare ? 'text-blue-600 font-semibold' : ''}>
                  Parte da riparare → sposta in giacenza
                </span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <label className={lbl}>Descrizione *</label>
              <input type="text" className={inp} placeholder="es. Hard disk, scheda madre…"
                value={parte.descrizione} onChange={e => onChange(index, 'descrizione', e.target.value)} />
            </div>
            <div className="col-span-4">
              <label className={lbl}>Modello</label>
              <input type="text" className={inp} placeholder="es. Seagate Barracuda 2TB"
                value={parte.modello} onChange={e => onChange(index, 'modello', e.target.value)} />
            </div>
            <div className="col-span-4">
              <label className={lbl}>Seriale / P/N / Cespite</label>
              <input type="text" className={inp} placeholder="SN: XYZ789"
                value={parte.seriale} onChange={e => onChange(index, 'seriale', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mt-2">
            <div className="col-span-2">
              <label className={lbl}>Tipo</label>
              <select className={inp} value={parte.tipo} onChange={e => onChange(index, 'tipo', e.target.value)}>
                <option value="">—</option>
                {TIPI_PARTE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-10">
              <label className={lbl}>Difetto riscontrato</label>
              <input type="text" className={inp} placeholder="es. Settori danneggiati, condensatori gonfi…"
                value={parte.difetto} onChange={e => onChange(index, 'difetto', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Divisore */}
        <div className="border-t border-dashed border-gray-200" />

        {/* — Ricambio installato — */}
        <div>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Ricambio installato</p>

          {/* Articolo collegato dal magazzino */}
          {parte.ricambio_articolo_id ? (
            <div className="flex items-center gap-2 mb-2 bg-green-50 border border-green-200 rounded px-3 py-2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-700">Collegato a magazzino — scarico automatico</p>
                <p className="text-xs text-green-600 truncate">{parte.ricambio_modello || parte.ricambio_descrizione}</p>
              </div>
              <button type="button" onClick={scollegaArticolo}
                className="text-xs text-gray-400 hover:text-red-500 shrink-0">Scollega</button>
            </div>
          ) : null}

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <label className={lbl}>Descrizione</label>
              <input type="text" className={inp} placeholder="es. Hard disk"
                value={parte.ricambio_descrizione} onChange={e => onChange(index, 'ricambio_descrizione', e.target.value)} />
            </div>
            <div className="col-span-4">
              <label className={lbl}>Modello</label>
              <input type="text" className={inp} placeholder="es. WD Blue 1TB SN550"
                value={parte.ricambio_modello} onChange={e => onChange(index, 'ricambio_modello', e.target.value)} />
            </div>
            <div className="col-span-4">
              <label className={lbl}>Seriale / P/N / Cespite</label>
              <div className="relative">
                <input type="text" className={inp} placeholder="SN: ABC123"
                  value={parte.ricambio_seriale} onChange={e => onChange(index, 'ricambio_seriale', e.target.value)} />
                {cercando && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
                )}
              </div>
              {/* Dropdown risultati magazzino */}
              {articoliTrovati.length > 0 && (
                <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-72">
                  <p className="text-xs text-gray-400 px-3 py-1.5 border-b">Trovato in magazzino — clicca per collegare</p>
                  {articoliTrovati.map(art => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => collegaArticolo(art)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                    >
                      <p className="font-medium text-gray-800 truncate">
                        {[art.marca, art.modello].filter(Boolean).join(' ') || art.descrizione}
                      </p>
                      <p className="text-xs text-gray-400">
                        {art.commitente} / {art.cliente} · Giacenza: {art.quantita_disponibile} {art.unita_misura}
                        {art.seriale && ` · S/N: ${art.seriale}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Camera modal ──────────────────────────────────────────────────────────── */
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [facing, setFacing] = useState('environment')
  const [preview, setPreview] = useState(null)  // dataUrl scattata, da confermare

  const startCamera = useCallback(async (facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    setReady(false)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch {
      setError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.')
    }
  }, [])

  useEffect(() => {
    startCamera(facing)
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const handleFlip = () => {
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    startCamera(next)
  }

  const handleScatta = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    setPreview(canvas.toDataURL('image/jpeg', 0.85))
  }

  const handleConferma = () => {
    if (preview) {
      onCapture(preview)
      setPreview(null)
    }
  }

  const handleRiscatta = () => setPreview(null)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-lg mx-4 bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <span className="text-sm font-semibold text-white">Scatta documento</span>
          <div className="flex items-center gap-2">
            {!preview && ready && (
              <button type="button" onClick={handleFlip}
                className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                title="Inverti fotocamera">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
          {error ? (
            <div className="text-center px-6">
              <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover" />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-sm">Attivazione camera...</div>
                </div>
              )}
              {/* Guide overlay */}
              {ready && (
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Canvas nascosto per cattura */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controlli */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-center gap-4">
          {preview ? (
            <>
              <button type="button" onClick={handleRiscatta}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition-colors">
                Riscatta
              </button>
              <button type="button" onClick={handleConferma}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                ✓ Usa questa foto
              </button>
            </>
          ) : (
            <button type="button" onClick={handleScatta} disabled={!ready || !!error}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-400 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed transition-transform shadow-lg"
              title="Scatta"
            >
              <span className="sr-only">Scatta</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Sezione documenti ──────────────────────────────────────────────────────── */
function DocumentiSection({ documenti, onChange }) {
  const [showCamera, setShowCamera] = useState(false)
  const fileRef = useRef(null)

  const handleCapture = (dataUrl) => {
    onChange([...documenti, { dataUrl, nome: `Foto ${documenti.length + 1}` }])
    setShowCamera(false)
  }

  const handleFileImport = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const readers = files.map(file => new Promise(resolve => {
      const r = new FileReader()
      r.onload = ev => resolve({ dataUrl: ev.target.result, nome: file.name })
      r.readAsDataURL(file)
    }))
    Promise.all(readers).then(nuovi => onChange([...documenti, ...nuovi]))
    e.target.value = ''
  }

  const remove = (i) => onChange(documenti.filter((_, idx) => idx !== i))

  const rename = (i, nome) => onChange(documenti.map((d, idx) => idx === i ? { ...d, nome } : d))

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3 pb-1 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Documenti allegati</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCamera(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Fotocamera
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Importa file
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
              onChange={handleFileImport} />
          </div>
        </div>

        {documenti.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">Scatta foto o importa immagini/PDF da allegare al rapporto</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {documenti.map((doc, i) => {
              const isPdf = doc.dataUrl?.startsWith('data:application/pdf') || doc.nome?.toLowerCase().endsWith('.pdf')
              return (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  {isPdf ? (
                    <div className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-red-50 gap-1">
                      <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6M9 17h4" />
                      </svg>
                      <span className="text-xs font-bold text-red-500 uppercase tracking-wide">PDF</span>
                    </div>
                  ) : (
                    <img src={doc.dataUrl || doc.url} alt={doc.nome}
                      className="w-full aspect-[4/3] object-cover" />
                  )}
                  <div className="p-2">
                    <input
                      type="text"
                      value={doc.nome}
                      onChange={e => rename(i, e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                    />
                  </div>
                  <button type="button" onClick={() => remove(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCamera && (
        <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      )}
    </>
  )
}

/* ─── Generatore PDF via print window ───────────────────────────────────────── */
function printChiusura(ticket, form, parti, documenti = []) {
  const fmt = (d, t) => {
    if (!d) return '—'
    return t ? `${d} ${t}` : d
  }
  const partiRows = parti.filter(p => p.descrizione?.trim()).map((p, i) => `
    <tr>
      <td style="font-weight:600">${i + 1}</td>
      <td>
        <div style="font-size:10px;color:#b91c1c;font-weight:700;text-transform:uppercase;margin-bottom:4px">Parte guasta</div>
        <div><strong>${p.descrizione || '—'}</strong></div>
        ${p.modello ? `<div style="color:#555;font-size:11px">Modello: ${p.modello}</div>` : ''}
        ${p.seriale ? `<div style="color:#555;font-size:11px">S/N: ${p.seriale}</div>` : ''}
        ${p.tipo ? `<div style="margin-top:3px"><span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700">${p.tipo}</span></div>` : ''}
        ${p.difetto ? `<div style="color:#666;font-size:11px;margin-top:2px">Difetto: ${p.difetto}</div>` : ''}
      </td>
      <td>
        <div style="font-size:10px;color:#15803d;font-weight:700;text-transform:uppercase;margin-bottom:4px">Ricambio installato</div>
        ${p.ricambio_descrizione ? `<div><strong>${p.ricambio_descrizione}</strong></div>` : '<div style="color:#999">—</div>'}
        ${p.ricambio_modello ? `<div style="color:#555;font-size:11px">Modello: ${p.ricambio_modello}</div>` : ''}
        ${p.ricambio_seriale ? `<div style="color:#555;font-size:11px">S/N: ${p.ricambio_seriale}</div>` : ''}
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Rapporto chiusura — Ticket #${ticket.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #555; font-size: 12px; margin-bottom: 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: bold; border-bottom: 2px solid #e5e7eb;
    padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .field label { font-size: 10px; color: #777; display: block; margin-bottom: 2px; }
  .field span { font-size: 12px; font-weight: 600; }
  .note-box { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px;
    padding: 10px; font-size: 12px; white-space: pre-wrap; min-height: 48px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 10px; border: 1px solid #d1d5db;
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .no-parti { color: #888; font-style: italic; font-size: 11px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-between; color: #9ca3af; font-size: 10px; }
  .esito-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
  .esito-Risolto { background: #d1fae5; color: #065f46; }
  .esito-Parzialmente { background: #fef3c7; color: #92400e; }
  .esito-Non { background: #fee2e2; color: #991b1b; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>Rapporto di chiusura — Ticket #${ticket.id}</h1>
  <div class="subtitle">
    ${ticket.nr_intervento ? `NR INT: <strong>${ticket.nr_intervento}</strong> &nbsp;|&nbsp; ` : ''}
    ${ticket.cliente ? `Cliente: <strong>${ticket.cliente}</strong> &nbsp;|&nbsp; ` : ''}
    ${ticket.commitente ? `Commitente: <strong>${ticket.commitente}</strong>` : ''}
    ${ticket.utente ? `&nbsp;|&nbsp; Utente: <strong>${ticket.utente}</strong>` : ''}
    ${ticket.citta ? `&nbsp;|&nbsp; ${ticket.citta}` : ''}
  </div>

  <div class="section">
    <div class="section-title">Dati intervento</div>
    <div class="grid">
      <div class="field"><label>Tecnico intervenuto</label><span>${form.tecnico_nome || '—'}</span></div>
      <div class="field"><label>Esito</label>
        <span class="esito-badge esito-${(form.esito || '').split(' ')[0]}">${form.esito || '—'}</span>
      </div>
      <div class="field"><label>Inizio intervento</label><span>${fmt(form.data_inizio, form.ora_inizio)}</span></div>
      <div class="field"><label>Fine intervento</label><span>${fmt(form.data_fine, form.ora_fine)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Note chiusura</div>
    <div class="note-box">${form.note_chiusura || '—'}</div>
  </div>

  <div class="section">
    <div class="section-title">Ricambi</div>
    ${partiRows ? `
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th style="width:45%">Parte guasta</th>
          <th>Ricambio installato</th>
        </tr>
      </thead>
      <tbody>${partiRows}</tbody>
    </table>` : '<p class="no-parti">Nessun ricambio registrato.</p>'}
  </div>

  ${documenti.length > 0 ? `
  <div class="section">
    <div class="section-title">Documenti allegati</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
      ${documenti.map(d => `
        <div style="break-inside:avoid">
          <img src="${d.dataUrl || d.url}" alt="${d.nome}"
            style="width:100%;border-radius:6px;border:1px solid #e5e7eb;display:block" />
          <div style="font-size:10px;color:#6b7280;margin-top:4px;text-align:center">${d.nome}</div>
        </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="footer">
    <span>Ticket #${ticket.id}</span>
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

/* ─── Modal principale ───────────────────────────────────────────────────────── */
export default function CloseTicketModal({ ticket, onClose, onClosed }) {
  const today = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    data_inizio: today,
    ora_inizio: '',
    data_fine: today,
    ora_fine: nowTime,
    tecnico_nome: ticket.tecnico ?? '',
    esito: 'Risolto',
    note_chiusura: '',
  })
  const [parti, setParti] = useState([])

  // Carica immagini già salvate dalla chiusura esistente (path → url autenticata)
  const existingDocs = ticket.chiusura?.documenti_json
    ? JSON.parse(ticket.chiusura.documenti_json).map(d => {
        const filename = d.path.split('/').pop()
        return { nome: d.nome, url: `/api/tickets/${ticket.id}/documenti/${filename}` }
      })
    : []
  const [documenti, setDocumenti] = useState(existingDocs)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  // ── Listino ──
  const [listini, setListini] = useState([])
  const [listinoSelezionato, setListinoSelezionato] = useState('')
  const [prestazioni, setPrestazioni] = useState([])

  useEffect(() => {
    if (ticket.commitente) {
      listiniApi.list(ticket.commitente).then(r => {
        setListini(r.data)
        if (r.data.length === 1) setListinoSelezionato(String(r.data[0].id))
      }).catch(() => {})
    }
  }, [ticket.commitente])

  const voceListino = listini.find(l => String(l.id) === listinoSelezionato)

  const togglePrestazione = (voce) => {
    setPrestazioni(prev => {
      const exists = prev.find(p => p.voce_id === voce.id)
      if (exists) return prev.filter(p => p.voce_id !== voce.id)
      return [...prev, { voce_id: voce.id, descrizione: voce.descrizione, prezzo: voce.prezzo, unita_misura: voce.unita_misura, quantita: 1 }]
    })
  }

  const updateQuantita = (voce_id, quantita) => {
    setPrestazioni(prev => prev.map(p => p.voce_id === voce_id ? { ...p, quantita: parseFloat(quantita) || 1 } : p))
  }

  const totale = prestazioni.reduce((sum, p) => {
    const prezzo = parseFloat(p.prezzo) || 0
    return sum + prezzo * (p.quantita || 1)
  }, 0)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addParte = () => setParti(p => [...p, {
    descrizione: '', modello: '', seriale: '', tipo: '', difetto: '',
    parte_ritirata: false,
    parte_da_riparare: false,
    ricambio_descrizione: '', ricambio_modello: '', ricambio_seriale: '',
    ricambio_articolo_id: null,
  }])

  const updateParte = (index, field, value) =>
    setParti(p => p.map((item, i) => i === index ? { ...item, [field]: value } : item))

  const removeParte = (index) =>
    setParti(p => p.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        parti: parti.filter(p => p.descrizione.trim() || p.ricambio_articolo_id),
        prestazioni: prestazioni.length > 0 ? prestazioni : undefined,
        documenti: documenti.filter(d => d.dataUrl).map(d => ({ nome: d.nome, dataUrl: d.dataUrl })),
      }
      await ticketsApi.chiudi(ticket.id, payload)
      setSaved(true)
      onClosed && onClosed()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante la chiusura')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={saved ? onClose : onClose} />
      <div className="modal-panel relative w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl sticky top-0 z-10">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Chiudi Ticket #{ticket.id}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {ticket.nr_intervento && <span className="font-mono mr-2">{ticket.nr_intervento}</span>}
              {ticket.cliente && <span>{ticket.cliente}</span>}
              {ticket.commitente && <span className="ml-2 text-gray-400">· {ticket.commitente}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── Stato: salvato con successo ── */}
        {saved ? (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800">Ticket chiuso con successo</p>
              <p className="text-sm text-gray-500 mt-1">
                Esito: <span className={`font-medium ${ESITO_COLORS[form.esito] || ''}`}>{form.esito}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => printChiusura(ticket, form, parti, documenti)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Stampa / Esporta PDF
              </button>
              <button onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
            )}

            {/* Orari */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Orari intervento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data inizio</label>
                  <input type="date" className={inputCls} value={form.data_inizio} onChange={e => set('data_inizio', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Ora inizio</label>
                  <input type="time" className={inputCls} value={form.ora_inizio} onChange={e => set('ora_inizio', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Data fine</label>
                  <input type="date" className={inputCls} value={form.data_fine} onChange={e => set('data_fine', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Ora fine</label>
                  <input type="time" className={inputCls} value={form.ora_fine} onChange={e => set('ora_fine', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Esito */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Esito intervento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tecnico intervenuto</label>
                  <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-700">
                    {ticket.tecnico || <span className="text-gray-400 italic">Non assegnato</span>}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Esito</label>
                  <select className={inputCls} value={form.esito} onChange={e => set('esito', e.target.value)}>
                    {ESITI.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className={labelCls}>Note chiusura</label>
                <textarea rows={4} className={inputCls}
                  placeholder="Descrizione dettagliata dell'intervento effettuato..."
                  value={form.note_chiusura} onChange={e => set('note_chiusura', e.target.value)} />
              </div>
            </div>

            {/* Prestazioni da listino */}
            {listini.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Prestazioni</h3>
                {listini.length > 1 && (
                  <div className="mb-3">
                    <label className={labelCls}>Listino prezzi</label>
                    <select className={inputCls} value={listinoSelezionato}
                      onChange={e => setListinoSelezionato(e.target.value)}>
                      <option value="">— Seleziona listino —</option>
                      {listini.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                  </div>
                )}

                {voceListino && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-8"></th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Prestazione</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Prezzo</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-20">Qtà</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Subtotale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {voceListino.voci.map(v => {
                          const sel = prestazioni.find(p => p.voce_id === v.id)
                          const sub = sel ? (parseFloat(v.prezzo) || 0) * (sel.quantita || 1) : null
                          return (
                            <tr key={v.id} className={sel ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" checked={!!sel} onChange={() => togglePrestazione(v)}
                                  className="w-4 h-4 accent-blue-600 cursor-pointer" />
                              </td>
                              <td className="px-3 py-2 text-gray-800">
                                {v.descrizione}
                                {v.unita_misura && <span className="text-gray-400 text-xs ml-1">/ {v.unita_misura}</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-700">
                                {v.prezzo ? `€ ${v.prezzo}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {sel ? (
                                  <input type="number" min="0.5" step="0.5"
                                    className="w-16 border border-gray-300 rounded px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    value={sel.quantita}
                                    onChange={e => updateQuantita(v.id, e.target.value)} />
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-700">
                                {sub !== null ? `€ ${sub.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {prestazioni.length > 0 && (
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-700 text-right">Totale</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">€ {totale.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Parti sostituite */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Parti sostituite</h3>
                <button type="button" onClick={addParte}
                  className="text-xs px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100">
                  + Aggiungi parte
                </button>
              </div>

              {parti.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Nessuna parte sostituita. Clicca "+ Aggiungi parte" per inserirne una.
                </p>
              ) : (
                <div className="space-y-3">
                  {parti.map((parte, i) => (
                    <ParteRow key={i} parte={parte} index={i} onChange={updateParte} onRemove={removeParte} ticket={ticket} />
                  ))}
                </div>
              )}
            </div>

            {/* Documenti */}
            <DocumentiSection documenti={documenti} onChange={setDocumenti} />

            {/* Footer */}
            <div className="flex gap-3 pt-2 border-t">
              <button type="submit" disabled={saving}
                className="flex-1 px-6 py-2.5 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : '✓ Conferma chiusura ticket'}
              </button>
              <button
                type="button"
                onClick={() => printChiusura(ticket, form, parti, documenti)}
                title="Anteprima PDF con i dati attuali"
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Anteprima PDF
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
