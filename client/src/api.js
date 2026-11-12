import axios from 'axios'

// `withCredentials: true` makes the browser send the httpOnly auth cookie (and
// the CSRF cookie) on every request to the API.
export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true
})

// --- CSRF protection --------------------------------------------------------
// The cookie alone proves nothing (the browser sends it for ANY site's request).
// So for every state-changing request we also send a CSRF token in a custom
// header. The server issues it from GET /csrf-token; a cross-site attacker can
// neither read that response (CORS) nor set the header from a plain <form>.

const SAFE_METHODS = new Set(['get', 'head', 'options'])
// Pre-auth routes are exempt on the server, so no token is needed for them.
const EXEMPT_URLS = ['/auth/login', '/auth/register']

let csrfToken = null
let csrfPromise = null

// Forget the cached token (it is bound to the session, so it must be refreshed
// whenever the session changes: login, register, logout).
export function resetCsrfToken() {
  csrfToken = null
  csrfPromise = null
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = api.get('/csrf-token')
      .then(res => {
        csrfToken = res.data.csrfToken
        return csrfToken
      })
      .finally(() => { csrfPromise = null })
  }
  return csrfPromise
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase()
  const url = config.url || ''
  if (SAFE_METHODS.has(method) || EXEMPT_URLS.some(u => url.includes(u))) return config

  const token = await getCsrfToken()
  config.headers.set('x-csrf-token', token)
  return config
})

api.interceptors.response.use(
  (response) => {
    // The session changed, so any token we hold is now stale.
    const url = response.config?.url || ''
    if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout')) {
      resetCsrfToken()
    }
    return response
  },
  async (error) => {
    const { config, response } = error
    // A stale token (e.g. session rotated in another tab) gets one automatic retry.
    if (response?.status === 403 && config && !config._csrfRetried &&
        /csrf/i.test(response.data?.message || '')) {
      config._csrfRetried = true
      resetCsrfToken()
      return api(config)
    }
    return Promise.reject(error)
  }
)
