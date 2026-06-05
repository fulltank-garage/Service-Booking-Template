import { adminApi } from '../../api/adminApi'

const serviceWorkerPath = '/admin-sw.js'

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

const arrayBufferToBase64Url = (buffer: ArrayBuffer | null) => {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const normalizePublicKey = (value: string) => value.trim().replace(/=+$/g, '')

const hasUsableSubscriptionKeys = (subscription: PushSubscription) => {
  const value = subscription.toJSON()
  return Boolean(value.endpoint && value.keys?.auth && value.keys?.p256dh)
}

const usesPublicKey = (subscription: PushSubscription, publicKey: string) =>
  arrayBufferToBase64Url(subscription.options.applicationServerKey ?? null) === normalizePublicKey(publicKey)

const saveSubscription = async (subscription: PushSubscription) => {
  if (!hasUsableSubscriptionKeys(subscription)) {
    throw new Error('ข้อมูลแจ้งเตือนเดิมไม่สมบูรณ์ กรุณาเปิดแจ้งเตือนอีกครั้ง')
  }
  await adminApi.subscribePush(subscription.toJSON())
}

const subscribeWithPublicKey = async (registration: ServiceWorkerRegistration, publicKey: string) => {
  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(publicKey),
    userVisibleOnly: true,
  })
  await saveSubscription(subscription)
  return subscription
}

const ensurePushSubscription = async (registration: ServiceWorkerRegistration, publicKey: string) => {
  const currentSubscription = await registration.pushManager.getSubscription()
  if (currentSubscription) {
    if (!hasUsableSubscriptionKeys(currentSubscription) || !usesPublicKey(currentSubscription, publicKey)) {
      await currentSubscription.unsubscribe().catch(() => false)
      return subscribeWithPublicKey(registration, publicKey)
    }
    await saveSubscription(currentSubscription)
    return currentSubscription
  }
  return subscribeWithPublicKey(registration, publicKey)
}

const getConfiguredPublicKey = async () => {
  const publicKey = await adminApi.getPushPublicKey()
  if (!publicKey.configured || !publicKey.publicKey) {
    throw new Error('เปิดสิทธิ์แจ้งเตือนแล้ว แต่ระบบยังไม่ได้ตั้งค่าคีย์ส่งแจ้งเตือนครบ')
  }
  return publicKey.publicKey
}

export const isPushNotificationSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const getCurrentPushPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export const isInstalledAppContext = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

const registerServiceWorker = async () => {
  const registration = await navigator.serviceWorker.register(serviceWorkerPath, { scope: '/' })
  await registration.update().catch(() => undefined)
  return navigator.serviceWorker.ready
}

export const registerAdminServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    await registerServiceWorker()
  }
}

export const enablePushNotifications = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('อุปกรณ์นี้ยังไม่รองรับการแจ้งเตือน')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน')
  }

  const registration = await registerServiceWorker()
  const subscription = await ensurePushSubscription(registration, await getConfiguredPublicKey())
  const report = await adminApi.testPush()
  if (report.attempted === 0 || report.sent === 0) {
    throw new Error('เปิดสิทธิ์แล้ว แต่ยังส่งทดสอบแจ้งเตือนไม่สำเร็จ กรุณาลองเปิดแจ้งเตือนอีกครั้ง')
  }
  return subscription
}

export const refreshPushSubscription = async () => {
  if (!isPushNotificationSupported() || getCurrentPushPermission() !== 'granted') {
    return null
  }

  const registration = await registerServiceWorker()
  return ensurePushSubscription(registration, await getConfiguredPublicKey())
}
