import axios from 'axios'

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1'

export const httpClient = axios.create({
  baseURL: apiBaseURL,
  timeout: import.meta.env.MODE === 'test' ? 20 : 8_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const isApiFallbackEnabled = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false'
