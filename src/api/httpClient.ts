import axios from 'axios'
import { authStorage } from '../features/auth/authStorage'

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1'
export const wsBaseURL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://127.0.0.1:8080/api/v1'

export const httpClient = axios.create({
  baseURL: apiBaseURL,
  timeout: import.meta.env.MODE === 'test' ? 20 : 8_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
