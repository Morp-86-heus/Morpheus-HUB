import { useState, useEffect, useRef } from 'react'
import { adminDbApi } from '../api/client'

// ── Icone ─────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function IconDatabase() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}

// ── Componenti UI ─────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
  }
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {type === 'success' ? <IconCheck /> : <IconAlert />}
      <span>{children}</span>
    </div>
  )
}

// ── Modal conferma import ─────────────────────────────────────────────────────

function ConfirmImportModal({ file, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
            <IconAlert />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conferma ripristino database
          </h3>
        </div>
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Stai per sovrascrivere <strong>tutti i dati</strong> del database con il contenuto del file:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 dark:text-gray-200 break-all">
            {file?.name}
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            Questa operazione è irreversibile. I dati correnti verranno persi.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Ripristino in corso...
              </>
            ) : (
              'Sì, ripristina'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pagina principale ─────────────────────────────────────────────────────────

export default function AdminDatabasePage() {
  const [info, setInfo] = useState(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState(null)

  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState(null)

  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importStatus, setImportStatus] = useState(null) // pending | running | done | error
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadInfo()
  }, [])

  async function loadInfo() {
    setInfoLoading(true)
    setInfoError(null)
    try {
      const { data } = await adminDbApi.info()
      setInfo(data)
    } catch (e) {
      setInfoError(e.response?.data?.detail || 'Errore nel caricamento info')
    } finally {
      setInfoLoading(false)
    }
  }

  async function handleExport() {
    setExportLoading(true)
    setExportError(null)
    try {
      // Scarica via fetch diretto per gestire il blob
      const token = localStorage.getItem('token')
      const orgId = localStorage.getItem('activeOrgId')
      const headers = { Authorization: `Bearer ${token}` }
      if (orgId) headers['X-Organization-Id'] = orgId

      const res = await fetch('/api/admin/db/export', { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : 'backup.sql.gz'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e.message || 'Errore durante l\'esportazione')
    } finally {
      setExportLoading(false)
    }
  }

  function handleFileDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  function selectFile(file) {
    setImportFile(file)
    setImportResult(null)
    setImportError(null)
  }

  async function handleImportConfirm() {
    setImportLoading(true)
    setImportError(null)
    setImportResult(null)
    setImportStatus('pending')
    setShowConfirm(false)
    try {
      // 1. Upload file → riceve job_id immediatamente
      const { data } = await adminDbApi.import(importFile)
      const jobId = data.job_id

      // 2. Polling stato ogni 3 secondi
      await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const { data: job } = await adminDbApi.importStatus(jobId)
            setImportStatus(job.status)
            if (job.status === 'done') {
              clearInterval(interval)
              resolve(job)
            } else if (job.status === 'error') {
              clearInterval(interval)
              reject(new Error(job.message))
            }
          } catch (e) {
            clearInterval(interval)
            reject(e)
          }
        }, 3000)
      })

      setImportResult('Database ripristinato con successo. La pagina si ricaricherà tra 3 secondi.')
      setImportFile(null)
      setTimeout(() => window.location.reload(), 3000)
    } catch (e) {
      setImportError(e.message || e.response?.data?.detail || 'Errore durante l\'importazione')
      setImportStatus(null)
    } finally {
      setImportLoading(false)
    }
  }

  const tableLabels = {
    tickets: 'Ticket',
    users: 'Utenti',
    organizzazioni: 'Organizzazioni',
    articoli: 'Articoli magazzino',
    fatture: 'Fatture',
    clienti_diretti: 'Clienti diretti',
    servizi: 'Servizi',
    opportunita: 'Opportunità',
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestione Database</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Esporta, importa e monitora il database dell'applicazione.
        </p>
      </div>

      {/* ── Info DB ── */}
      <Card>
        <CardHeader
          icon={<IconDatabase />}
          title="Stato del database"
          subtitle="Dimensione e conteggio record per tabella"
        />
        <div className="p-5">
          {infoLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Caricamento...
            </div>
          ) : infoError ? (
            <Alert type="error">{infoError}</Alert>
          ) : info && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Dimensione</div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{info.db_size}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Migrazione</div>
                  <div className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1 font-mono">{info.alembic_version}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(info.table_counts).map(([table, count]) => (
                  <div key={table} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{tableLabels[table] || table}</div>
                    <div className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {count !== null ? count.toLocaleString('it-IT') : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Export ── */}
      <Card>
        <CardHeader
          icon={<IconDownload />}
          title="Esporta database"
          subtitle="Scarica un backup completo in formato .sql.gz"
        />
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Il backup include tutti i dati, le tabelle e le configurazioni. Il file viene compresso automaticamente.
          </p>
          {exportError && <Alert type="error">{exportError}</Alert>}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {exportLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generazione backup...
              </>
            ) : (
              <>
                <IconDownload />
                Scarica backup
              </>
            )}
          </button>
        </div>
      </Card>

      {/* ── Import ── */}
      <Card>
        <CardHeader
          icon={<IconUpload />}
          title="Importa database"
          subtitle="Ripristina un backup precedente (.sql o .sql.gz)"
        />
        <div className="p-5 space-y-4">
          <Alert type="warning">
            L'importazione sovrascrive tutti i dati esistenti. Esegui prima un backup.
          </Alert>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,.sql.gz,.gz"
              className="hidden"
              onChange={(e) => e.target.files[0] && selectFile(e.target.files[0])}
            />
            {importFile ? (
              <div className="space-y-1">
                <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">{importFile.name}</div>
                <div className="text-xs text-gray-400">
                  {(importFile.size / 1024 / 1024).toFixed(2)} MB — clicca per cambiare file
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <IconUpload />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Trascina qui il file oppure <span className="text-blue-600 dark:text-blue-400">sfoglia</span>
                </div>
                <div className="text-xs text-gray-400">.sql oppure .sql.gz</div>
              </div>
            )}
          </div>

          {importLoading && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {importStatus === 'pending' && 'Upload in corso...'}
              {importStatus === 'running' && 'Ripristino database in corso... (può richiedere alcuni minuti)'}
              {(!importStatus || importStatus === 'pending') && 'Caricamento file...'}
            </div>
          )}
          {importResult && <Alert type="success">{importResult}</Alert>}
          {importError && <Alert type="error">{importError}</Alert>}

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!importFile || importLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconUpload />
            Ripristina database
          </button>
        </div>
      </Card>

      {showConfirm && (
        <ConfirmImportModal
          file={importFile}
          loading={importLoading}
          onConfirm={handleImportConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
