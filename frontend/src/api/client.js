import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  paramsSerializer: (params) => {
    const parts = []
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined || val === null || val === '') continue
      if (Array.isArray(val)) {
        val.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`))
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
      }
    }
    return parts.join('&')
  },
})

// Inietta JWT e, se presente, X-Organization-Id
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const activeOrgId = localStorage.getItem('activeOrgId')
  if (activeOrgId) {
    config.headers['X-Organization-Id'] = activeOrgId
  }
  return config
})

// Intercetta 403: notifica l'utente con un messaggio preciso
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const detail = error.response.data?.detail || 'Operazione non autorizzata'
      window.dispatchEvent(new CustomEvent('auth-error', { detail }))
    }
    return Promise.reject(error)
  }
)

export const eventiApi = {
  list: (params) => api.get('/eventi', { params }),
  create: (data) => api.post('/eventi', data),
  update: (id, data) => api.put(`/eventi/${id}`, data),
  delete: (id) => api.delete(`/eventi/${id}`),
}

export const ticketsApi = {
  list: (params) => api.get('/tickets', { params }),
  get: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),
  chiudi: (id, data) => api.post(`/tickets/${id}/chiudi`, data),
  salvaDocumenti: (id, documenti) => api.post(`/tickets/${id}/documenti`, { documenti }),
  getChiusura: (id) => api.get(`/tickets/${id}/chiusura`),
  export: (params) => api.get('/tickets/export/excel', { params, responseType: 'blob' }),
  nextProgressivo: (tecnico, data_gestione, exclude_id) =>
    api.get('/tickets/next-progressivo', { params: { tecnico, data_gestione, ...(exclude_id ? { exclude_id } : {}) } }),
}

export const lookupApi = {
  commitenti: () => api.get('/lookup/commitenti'),
  clienti: (commitente) => api.get('/lookup/clienti', { params: commitente ? { commitente } : {} }),
  tecnici: () => api.get('/lookup/tecnici'),
  stati: () => api.get('/lookup/stati'),
  citta: () => api.get('/lookup/citta'),
}

export const statsApi = {
  dashboard: () => api.get('/stats/dashboard'),
  perTecnico: () => api.get('/stats/per-tecnico'),
  perStato: () => api.get('/stats/per-stato'),
  slaCompliance: () => api.get('/stats/sla-compliance'),
  trendMensile: () => api.get('/stats/trend-mensile'),
}

export const listiniApi = {
  list: (commitente) => api.get('/listini', { params: commitente ? { commitente } : {} }),
  create: (data) => api.post('/listini', data),
  update: (id, data) => api.put(`/listini/${id}`, data),
  delete: (id) => api.delete(`/listini/${id}`),
  duplicate: (id, data) => api.post(`/listini/${id}/duplicate`, data),
  addVoce: (lid, data) => api.post(`/listini/${lid}/voci`, data),
  updateVoce: (lid, vid, data) => api.put(`/listini/${lid}/voci/${vid}`, data),
  deleteVoce: (lid, vid) => api.delete(`/listini/${lid}/voci/${vid}`),
}

export const magazzinoApi = {
  list: (params) => api.get('/magazzino/articoli', { params }),
  create: (data) => api.post('/magazzino/articoli', data),
  update: (id, data) => api.put(`/magazzino/articoli/${id}`, data),
  delete: (id) => api.delete(`/magazzino/articoli/${id}`),
  addMovimento: (id, data) => api.post(`/magazzino/articoli/${id}/movimenti`, data),
  sposta: (id, data) => api.post(`/magazzino/articoli/${id}/sposta`, data),
  cercaArticolo: (params) => api.get('/magazzino/cerca-articolo', { params }),
  categorie: () => api.get('/magazzino/categorie'),
  movimenti: (params) => api.get('/magazzino/movimenti', { params }),
  sottoMagazzini: (commitente) => api.get('/magazzino/sotto-magazzini', { params: commitente ? { commitente } : {} }),
  createSottoMagazzino: (data) => api.post('/magazzino/sotto-magazzini', data),
  updateSottoMagazzino: (id, data) => api.put(`/magazzino/sotto-magazzini/${id}`, data),
  deleteSottoMagazzino: (id) => api.delete(`/magazzino/sotto-magazzini/${id}`),
}

export const organizzazioniApi = {
  list: () => api.get('/organizzazioni'),
  create: (data) => api.post('/organizzazioni', data),
  get: (id) => api.get(`/organizzazioni/${id}`),
  update: (id, data) => api.put(`/organizzazioni/${id}`, data),
  delete: (id) => api.delete(`/organizzazioni/${id}`),
  stats: (id) => api.get(`/organizzazioni/${id}/stats`),
  utenti: (id) => api.get(`/organizzazioni/${id}/utenti`),
  // Licenze
  attivaTrial: (id, data) => api.post(`/organizzazioni/${id}/trial`, data),
  attivaLicenza: (id, data) => api.post(`/organizzazioni/${id}/licenza/attiva`, data),
  disattivaLicenza: (id) => api.post(`/organizzazioni/${id}/licenza/disattiva`),
  aggiornaLicenza: (id, data) => api.patch(`/organizzazioni/${id}/licenza`, data),
}

export const contabilitaApi = {
  // Fatture
  listFatture: (params) => api.get('/contabilita/fatture', { params }),
  getFattura: (id) => api.get(`/contabilita/fatture/${id}`),
  createFattura: (data) => api.post('/contabilita/fatture', data),
  updateFattura: (id, data) => api.put(`/contabilita/fatture/${id}`, data),
  deleteFattura: (id) => api.delete(`/contabilita/fatture/${id}`),
  invia: (id) => api.post(`/contabilita/fatture/${id}/invia`),
  annulla: (id) => api.post(`/contabilita/fatture/${id}/annulla`),
  // Voci
  addVoce: (fid, data) => api.post(`/contabilita/fatture/${fid}/voci`, data),
  updateVoce: (fid, vid, data) => api.put(`/contabilita/fatture/${fid}/voci/${vid}`, data),
  deleteVoce: (fid, vid) => api.delete(`/contabilita/fatture/${fid}/voci/${vid}`),
  // Pagamenti
  addPagamento: (fid, data) => api.post(`/contabilita/fatture/${fid}/pagamenti`, data),
  deletePagamento: (fid, pid) => api.delete(`/contabilita/fatture/${fid}/pagamenti/${pid}`),
  // Stats
  stats: () => api.get('/contabilita/stats'),
  statsPerOrg: (params) => api.get('/contabilita/stats/per-organizzazione', { params }),
  trend: (params) => api.get('/contabilita/stats/trend-mensile', { params }),
}

export const notificheApi = {
  list: () => api.get('/notifiche'),
  markRead: (id) => api.post(`/notifiche/${id}/leggi`),
  markAllRead: () => api.post('/notifiche/leggi-tutte'),
}

export const permessiApi = {
  miei: () => api.get('/permessi/miei'),
  matrice: () => api.get('/permessi/matrice'),
  default: () => api.get('/permessi/default'),
  updateMatrice: (data) => api.put('/permessi/matrice', data),
}

export const serviziApi = {
  list: (params) => api.get('/servizi', { params }),
  create: (data) => api.post('/servizi', data),
  update: (id, data) => api.put(`/servizi/${id}`, data),
  delete: (id) => api.delete(`/servizi/${id}`),
}

export const contrattiServiziApi = {
  list: (params) => api.get('/contratti-servizi', { params }),
  create: (data) => api.post('/contratti-servizi', data),
  update: (id, data) => api.put(`/contratti-servizi/${id}`, data),
  delete: (id) => api.delete(`/contratti-servizi/${id}`),
  scadenze: (giorni = 30) => api.get('/contratti-servizi/scadenze', { params: { giorni } }),
}

export const clientiDirettiApi = {
  list: (params) => api.get('/clienti-diretti', { params }),
  create: (data) => api.post('/clienti-diretti', data),
  update: (id, data) => api.put(`/clienti-diretti/${id}`, data),
  delete: (id) => api.delete(`/clienti-diretti/${id}`),
}

export const opportunitaApi = {
  list: (params) => api.get('/opportunita', { params }),
  stats: () => api.get('/opportunita/stats'),
  create: (data) => api.post('/opportunita', data),
  update: (id, data) => api.put(`/opportunita/${id}`, data),
  delete: (id) => api.delete(`/opportunita/${id}`),
}

export const emailConfigApi = {
  getSmtp: () => api.get('/email-config/smtp'),
  updateSmtp: (data) => api.put('/email-config/smtp', data),
  getNotifiche: () => api.get('/email-config/notifiche'),
  updateNotifiche: (data) => api.put('/email-config/notifiche', data),
  testEmail: (to_email) => api.post('/email-config/test', { to_email }),
  // SMTP di sistema (solo proprietario)
  getSystemSmtp: () => api.get('/email-config/system/smtp'),
  updateSystemSmtp: (data) => api.put('/email-config/system/smtp', data),
  testSystemEmail: (to_email) => api.post('/email-config/system/test', { to_email }),
}

export const adminDbApi = {
  info: () => api.get('/admin/db/info'),
  exportUrl: () => '/api/admin/db/export',
  import: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/admin/db/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minuti per l'upload
    })
  },
  importStatus: (jobId) => api.get(`/admin/db/import/status/${jobId}`),
}

export default api
