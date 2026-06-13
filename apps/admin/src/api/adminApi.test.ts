import { describe, expect, it, vi } from 'vitest'
import { adminApi } from './adminApi'
import { httpClient } from './httpClient'

vi.mock('./httpClient', () => ({
  httpClient: {
    post: vi.fn(),
  },
}))

const mockedHttpClient = vi.mocked(httpClient)

describe('adminApi', () => {
  it('sends the full push subscription when testing notifications', async () => {
    mockedHttpClient.post.mockResolvedValueOnce({
      data: {
        data: { attempted: 1, sent: 1, expired: 0, failed: 0 },
      },
    })
    const subscription = {
      endpoint: 'https://push.example.test/current',
      keys: {
        auth: 'auth-key',
        p256dh: 'p256dh-key',
      },
    }

    await adminApi.testPush(subscription)

    expect(mockedHttpClient.post).toHaveBeenCalledWith('/admin/push/test', subscription)
  })
})
