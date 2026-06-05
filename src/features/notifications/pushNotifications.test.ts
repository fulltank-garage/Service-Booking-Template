import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '../../api/adminApi'
import { enablePushNotifications } from './pushNotifications'

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    getPushPublicKey: vi.fn(),
    subscribePush: vi.fn(),
  },
}))

const mockedAdminApi = vi.mocked(adminApi)

describe('pushNotifications', () => {
  beforeEach(() => {
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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stops enabling push when the backend VAPID configuration is incomplete', async () => {
    mockedAdminApi.getPushPublicKey.mockResolvedValue({ configured: false, publicKey: 'public-key' })

    await expect(enablePushNotifications()).rejects.toThrow('ระบบยังไม่ได้ตั้งค่าคีย์ส่งแจ้งเตือนครบ')
    expect(mockedAdminApi.subscribePush).not.toHaveBeenCalled()
  })
})
