import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../api/adminApi'
import { enablePushNotifications } from './pushNotifications'

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    getPushPublicKey: vi.fn(),
    subscribePush: vi.fn(),
    testPush: vi.fn(),
  },
}))

const mockedAdminApi = vi.mocked(adminApi)

describe('pushNotifications repair flow', () => {
  beforeEach(() => {
    vi.stubGlobal('PushManager', class PushManager {})
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') })
    mockedAdminApi.getPushPublicKey.mockReset()
    mockedAdminApi.subscribePush.mockReset()
    mockedAdminApi.testPush.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('repairs the push subscription when the first notification test fails', async () => {
    const oldSubscription = createSubscription('https://push.example.test/old', 'old-auth', 'old-p256dh', true)
    const repairedSubscription = createSubscription('https://push.example.test/repaired', 'new-auth', 'new-p256dh')
    const subscribe = vi.fn().mockResolvedValue(repairedSubscription)
    mockServiceWorker(oldSubscription, subscribe)
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })
    mockedAdminApi.testPush
      .mockResolvedValueOnce({ attempted: 1, sent: 0, expired: 1, failed: 1 })
      .mockResolvedValueOnce({ attempted: 1, sent: 1, expired: 0, failed: 0 })

    await enablePushNotifications()

    expect(oldSubscription.unsubscribe).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalledWith({ applicationServerKey: new Uint8Array([1, 2, 3]), userVisibleOnly: true })
    expect(mockedAdminApi.testPush).toHaveBeenNthCalledWith(1, { endpoint: 'https://push.example.test/old', keys: { auth: 'old-auth', p256dh: 'old-p256dh' } })
    expect(mockedAdminApi.testPush).toHaveBeenNthCalledWith(2, { endpoint: 'https://push.example.test/repaired', keys: { auth: 'new-auth', p256dh: 'new-p256dh' } })
  })

  it('includes provider status and error details when push repair still fails', async () => {
    const oldSubscription = createSubscription('https://push.example.test/old', 'old-auth', 'old-p256dh', true)
    const repairedSubscription = createSubscription('https://push.example.test/repaired', 'new-auth', 'new-p256dh')
    mockServiceWorker(oldSubscription, vi.fn().mockResolvedValue(repairedSubscription))
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })
    mockedAdminApi.testPush
      .mockResolvedValueOnce({ attempted: 1, sent: 0, expired: 0, failed: 1, lastStatusCode: 403, lastError: 'web push response status 403' })
      .mockResolvedValueOnce({ attempted: 1, sent: 0, expired: 0, failed: 1, lastStatusCode: 401, lastError: 'web push response status 401: BadJwtToken' })

    await expect(enablePushNotifications()).rejects.toThrow(
      'attempted=1, sent=0, failed=1, expired=0, status=401, error=web push response status 401: BadJwtToken',
    )
  })
})

function createSubscription(endpoint: string, auth: string, p256dh: string, withUnsubscribe = false) {
  return {
    options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
    toJSON: () => ({ endpoint, keys: { auth, p256dh } }),
    unsubscribe: withUnsubscribe ? vi.fn().mockResolvedValue(true) : undefined,
  } as unknown as PushSubscription
}

function mockServiceWorker(subscription: PushSubscription, subscribe: ReturnType<typeof vi.fn>) {
  const registration = {
    pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription), subscribe },
    update: vi.fn().mockResolvedValue(undefined),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(registration), register: vi.fn().mockResolvedValue(registration) },
  })
}
