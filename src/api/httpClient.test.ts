import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { authStorage } from '../features/auth/authStorage'
import { httpClient } from './httpClient'

describe('httpClient auth refresh', () => {
  const originalAdapter = httpClient.defaults.adapter

  beforeEach(() => {
    window.localStorage.clear()
    authStorage.setSession({
      email: 'admin@example.com',
      name: 'Service Booking Admin',
      token: 'old-token',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter
    window.localStorage.clear()
  })

  it('refreshes the admin session and retries the failed request after 401', async () => {
    const requests: Array<{ url?: string; authorization?: string }> = []
    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      requests.push({
        url: config.url,
        authorization: String(config.headers.Authorization ?? ''),
      })

      if (config.url === '/admin/bookings' && requests.length === 1) {
        return {
          config,
          data: { error: 'unauthorized' },
          headers: {},
          status: 401,
          statusText: 'Unauthorized',
        }
      }

      if (config.url === '/admin/auth/refresh') {
        return {
          config,
          data: {
            data: {
              email: 'admin@example.com',
              name: 'Service Booking Admin',
              token: 'new-token',
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          headers: {},
          status: 200,
          statusText: 'OK',
        }
      }

      return {
        config,
        data: { data: [] },
        headers: {},
        status: 200,
        statusText: 'OK',
      }
    }
    httpClient.defaults.adapter = adapter

    const response = await httpClient.get('/admin/bookings')

    expect(response.status).toBe(200)
    expect(authStorage.getToken()).toBe('new-token')
    expect(requests).toEqual([
      { url: '/admin/bookings', authorization: 'Bearer old-token' },
      { url: '/admin/auth/refresh', authorization: 'Bearer old-token' },
      { url: '/admin/bookings', authorization: 'Bearer new-token' },
    ])
  })
})
