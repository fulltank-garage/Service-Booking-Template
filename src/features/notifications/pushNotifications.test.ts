import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../api/adminApi'
import { enablePushNotifications, refreshPushSubscription } from './pushNotifications'

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    getPushPublicKey: vi.fn(),
    subscribePush: vi.fn(),
    testPush: vi.fn(),
  },
}))

const mockedAdminApi = vi.mocked(adminApi)

describe('pushNotifications', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('PushManager', class PushManager {})
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn(),
          },
          update: vi.fn().mockResolvedValue(undefined),
        }),
        register: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn(),
          },
          update: vi.fn().mockResolvedValue(undefined),
        }),
      },
    })
    mockedAdminApi.getPushPublicKey.mockReset()
    mockedAdminApi.subscribePush.mockReset()
    mockedAdminApi.testPush.mockReset()
    mockedAdminApi.testPush.mockResolvedValue({ attempted: 1, sent: 1, expired: 0, failed: 0 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stops enabling push when the backend VAPID configuration is incomplete', async () => {
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: false, publicKey: 'public-key' })

    await expect(enablePushNotifications()).rejects.toThrow('ระบบยังไม่ได้ตั้งค่าคีย์ส่งแจ้งเตือนครบ')
    expect(mockedAdminApi.subscribePush).not.toHaveBeenCalled()
  })

  it('re-subscribes when an existing subscription uses an old VAPID key', async () => {
    const oldSubscription = {
      options: { applicationServerKey: new Uint8Array([9, 9, 9]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/old', keys: { auth: 'auth', p256dh: 'p256dh' } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    } as unknown as PushSubscription
    const nextSubscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/new', keys: { auth: 'auth', p256dh: 'p256dh' } }),
    } as unknown as PushSubscription
    const subscribe = vi.fn().mockResolvedValue(nextSubscription)
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(oldSubscription),
        subscribe,
      },
      update: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: vi.fn().mockResolvedValue(registration),
      },
    })
    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      value: 'granted',
    })
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })

    await refreshPushSubscription()

    expect(oldSubscription.unsubscribe).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalledWith({
      applicationServerKey: new Uint8Array([1, 2, 3]),
      userVisibleOnly: true,
    })
    expect(mockedAdminApi.subscribePush).toHaveBeenCalledWith({
      endpoint: 'https://push.example.test/new',
      keys: { auth: 'auth', p256dh: 'p256dh' },
    })
    expect(mockedAdminApi.testPush).toHaveBeenCalledWith({
      endpoint: 'https://push.example.test/new',
      keys: { auth: 'auth', p256dh: 'p256dh' },
    })
  })

  it('sends a test push when enabling notifications succeeds', async () => {
    const subscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/new', keys: { auth: 'auth', p256dh: 'p256dh' } }),
    } as unknown as PushSubscription
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(subscription),
      },
      update: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: vi.fn().mockResolvedValue(registration),
      },
    })
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })

    await enablePushNotifications()

    expect(mockedAdminApi.testPush).toHaveBeenCalledWith({
      endpoint: 'https://push.example.test/new',
      keys: { auth: 'auth', p256dh: 'p256dh' },
    })
  })

  it('verifies an existing granted subscription when no recent verification exists', async () => {
    const subscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/existing', keys: { auth: 'auth', p256dh: 'p256dh' } }),
    } as unknown as PushSubscription
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
        subscribe: vi.fn(),
      },
      update: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: vi.fn().mockResolvedValue(registration),
      },
    })
    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      value: 'granted',
    })
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })

    await refreshPushSubscription()

    expect(mockedAdminApi.testPush).toHaveBeenCalledWith({
      endpoint: 'https://push.example.test/existing',
      keys: { auth: 'auth', p256dh: 'p256dh' },
    })
  })

  it('skips testing an existing subscription after a recent successful verification', async () => {
    const subscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/existing', keys: { auth: 'auth', p256dh: 'p256dh' } }),
    } as unknown as PushSubscription
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
        subscribe: vi.fn(),
      },
      update: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: vi.fn().mockResolvedValue(registration),
      },
    })
    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      value: 'granted',
    })
    window.localStorage.setItem(
      'service-booking-admin-push-verified',
      JSON.stringify({ endpoint: 'https://push.example.test/existing', verifiedAt: Date.now() }),
    )
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })

    await refreshPushSubscription()

    expect(mockedAdminApi.testPush).not.toHaveBeenCalled()
  })

  it('repairs the push subscription when the first notification test fails', async () => {
    const oldSubscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/old', keys: { auth: 'old-auth', p256dh: 'old-p256dh' } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    } as unknown as PushSubscription
    const repairedSubscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/repaired', keys: { auth: 'new-auth', p256dh: 'new-p256dh' } }),
    } as unknown as PushSubscription
    const subscribe = vi.fn().mockResolvedValue(repairedSubscription)
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(oldSubscription),
        subscribe,
      },
      update: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: vi.fn().mockResolvedValue(registration),
      },
    })
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })
    mockedAdminApi.testPush
      .mockResolvedValueOnce({ attempted: 1, sent: 0, expired: 1, failed: 1 })
      .mockResolvedValueOnce({ attempted: 1, sent: 1, expired: 0, failed: 0 })

    await enablePushNotifications()

    expect(oldSubscription.unsubscribe).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalledWith({
      applicationServerKey: new Uint8Array([1, 2, 3]),
      userVisibleOnly: true,
    })
    expect(mockedAdminApi.testPush).toHaveBeenNthCalledWith(1, {
      endpoint: 'https://push.example.test/old',
      keys: { auth: 'old-auth', p256dh: 'old-p256dh' },
    })
    expect(mockedAdminApi.testPush).toHaveBeenNthCalledWith(2, {
      endpoint: 'https://push.example.test/repaired',
      keys: { auth: 'new-auth', p256dh: 'new-p256dh' },
    })
  })

  it('includes provider status and error details when push repair still fails', async () => {
    const oldSubscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/old', keys: { auth: 'old-auth', p256dh: 'old-p256dh' } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    } as unknown as PushSubscription
    const repairedSubscription = {
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ endpoint: 'https://push.example.test/repaired', keys: { auth: 'new-auth', p256dh: 'new-p256dh' } }),
    } as unknown as PushSubscription
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(oldSubscription),
        subscribe: vi.fn().mockResolvedValue(repairedSubscription),
      },
      update: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: vi.fn().mockResolvedValue(registration),
      },
    })
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: true, publicKey: 'AQID' })
    mockedAdminApi.testPush
      .mockResolvedValueOnce({ attempted: 1, sent: 0, expired: 0, failed: 1, lastStatusCode: 403, lastError: 'web push response status 403' })
      .mockResolvedValueOnce({ attempted: 1, sent: 0, expired: 0, failed: 1, lastStatusCode: 401, lastError: 'web push response status 401: BadJwtToken' })

    await expect(enablePushNotifications()).rejects.toThrow(
      'attempted=1, sent=0, failed=1, expired=0, status=401, error=web push response status 401: BadJwtToken',
    )
  })
})
