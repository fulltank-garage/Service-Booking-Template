import axios from 'axios'
import { authStorage } from '../features/auth/authStorage'

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1'
export const wsBaseURL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://127.0.0.1:8080/api/v1'

type AdminSessionResponse = {
  email: string
  expiresAt: string
  name: string
  token: string
}

type RefreshableRequestConfig = {
  _retryAuthRefresh?: boolean
  _skipAuthRefresh?: boolean
}

const refreshThresholdMs = 7 * 24 * 60 * 60 * 1000
let refreshSessionRequest: Promise<string> | null = null

export const httpClient = axios.create({
  baseURL: apiBaseURL,
  timeout: import.meta.env.MODE === 'test' ? 20 : 8_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const shouldRefreshSoon = () => {
  const expiresAt = authStorage.getExpiresAt()
  if (!expiresAt) return false
  const expiresAtMs = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresAtMs)) return false
  return expiresAtMs - Date.now() <= refreshThresholdMs
}

const refreshAdminSession = async () => {
  if (!refreshSessionRequest) {
    refreshSessionRequest = httpClient
      .post<{ data: AdminSessionResponse }>('/admin/auth/refresh', undefined, { _skipAuthRefresh: true } as never)
      .then((response) => {
        const session = response.data.data
        authStorage.setSession(session)
        return session.token
      })
      .finally(() => {
        refreshSessionRequest = null
      })
  }
  return refreshSessionRequest
}

httpClient.interceptors.request.use(async (config) => {
  const refreshConfig = config as typeof config & RefreshableRequestConfig
  if (!refreshConfig._skipAuthRefresh && shouldRefreshSoon() && authStorage.getToken()) {
    await refreshAdminSession()
  }
  const token = authStorage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpClient.interceptors.response.use(
  async (response) => {
    if (response.status !== 401) {
      return response
    }
    const config = response.config as typeof response.config & RefreshableRequestConfig
    if (config._skipAuthRefresh || config._retryAuthRefresh || !authStorage.getToken()) {
      return response
    }
    config._retryAuthRefresh = true
    await refreshAdminSession()
    return httpClient(config)
  },
  async (error) => {
    const status = error?.response?.status
    const config = error?.config as (typeof error.config & RefreshableRequestConfig) | undefined
    if (status !== 401 || !config || config._skipAuthRefresh || config._retryAuthRefresh || !authStorage.getToken()) {
      return Promise.reject(error)
    }
    config._retryAuthRefresh = true
    await refreshAdminSession()
    return httpClient(config)
  },
)
