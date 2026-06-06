import { adminApi } from '../../api/adminApi'

const serviceWorkerPath = '/admin-sw.js'
const pushVerificationStorageKey = 'service-booking-admin-push-verified'
const pushVerificationTtlMs = 24 * 60 * 60 * 1000

type PushDeliveryReport = {
  attempted: number
  sent: number
  expired: number
  failed: number
  lastStatusCode?: number
  lastError?: string
}

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

const getSubscriptionEndpoint = (subscription: PushSubscription) => subscription.toJSON().endpoint ?? ''

const usesPublicKey = (subscription: PushSubscription, publicKey: string) =>
  arrayBufferToBase64Url(subscription.options.applicationServerKey ?? null) === normalizePublicKey(publicKey)

const readPushVerification = () => {
  try {
    return JSON.parse(window.localStorage.getItem(pushVerificationStorageKey) ?? '{}') as {
      endpoint?: string
      verifiedAt?: number
    }
  } catch {
    return {}
  }
}

const hasRecentPushVerification = (subscription: PushSubscription) => {
  const verification = readPushVerification()
  return (
    verification.endpoint === getSubscriptionEndpoint(subscription) &&
    typeof verification.verifiedAt === 'number' &&
    Date.now() - verification.verifiedAt < pushVerificationTtlMs
  )
}

const rememberPushVerification = (subscription: PushSubscription) => {
  window.localStorage.setItem(
    pushVerificationStorageKey,
    JSON.stringify({ endpoint: getSubscriptionEndpoint(subscription), verifiedAt: Date.now() }),
  )
}

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
      return { subscription: await subscribeWithPublicKey(registration, publicKey), isNewOrRepaired: true }
    }
    await saveSubscription(currentSubscription)
    return { subscription: currentSubscription, isNewOrRepaired: false }
  }
  return { subscription: await subscribeWithPublicKey(registration, publicKey), isNewOrRepaired: true }
}

const isPushDelivered = (report: PushDeliveryReport) => report.attempted > 0 && report.sent > 0

const formatPushReport = (report: PushDeliveryReport) => {
  const parts = [
    `attempted=${report.attempted}`,
    `sent=${report.sent}`,
    `failed=${report.failed}`,
    `expired=${report.expired}`,
  ]
  if (report.lastStatusCode) {
    parts.push(`status=${report.lastStatusCode}`)
  }
  if (report.lastError) {
    parts.push(`error=${report.lastError}`)
  }
  return parts.join(', ')
}

const testPushSubscription = async (subscription: PushSubscription) => adminApi.testPush(subscription.toJSON())

const repairAndTestPushSubscription = async (registration: ServiceWorkerRegistration, publicKey: string) => {
  const currentSubscription = await registration.pushManager.getSubscription()
  await currentSubscription?.unsubscribe().catch(() => false)
  const subscription = await subscribeWithPublicKey(registration, publicKey)
  const report = await testPushSubscription(subscription)
  return { report, subscription }
}

const verifyPushSubscription = async (
  registration: ServiceWorkerRegistration,
  publicKey: string,
  subscription: PushSubscription,
  prefix: string,
) => {
  const firstReport = await testPushSubscription(subscription)
  if (isPushDelivered(firstReport)) {
    rememberPushVerification(subscription)
    return subscription
  }

  const repaired = await repairAndTestPushSubscription(registration, publicKey)
  if (isPushDelivered(repaired.report)) {
    rememberPushVerification(repaired.subscription)
    return repaired.subscription
  }

  throw new Error(`${prefix} (${formatPushReport(repaired.report)})`)
}

const getConfiguredPublicKey = async () => {
  const publicKey = await adminApi.getPushPublicKey()
  if (publicKey.error) {
    throw new Error(publicKey.error)
  }
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
  const publicKey = await getConfiguredPublicKey()
  const { subscription } = await ensurePushSubscription(registration, publicKey)
  return verifyPushSubscription(
    registration,
    publicKey,
    subscription,
    'เปิดสิทธิ์แล้ว แต่ยังส่งทดสอบแจ้งเตือนไม่สำเร็จ กรุณาลองเปิดแจ้งเตือนอีกครั้ง',
  )
}

export const refreshPushSubscription = async () => {
  if (!isPushNotificationSupported() || getCurrentPushPermission() !== 'granted') {
    return null
  }

  const registration = await registerServiceWorker()
  const publicKey = await getConfiguredPublicKey()
  const result = await ensurePushSubscription(registration, publicKey)
  if (result.isNewOrRepaired || !hasRecentPushVerification(result.subscription)) {
    return verifyPushSubscription(
      registration,
      publicKey,
      result.subscription,
      'ซิงก์แจ้งเตือนแล้ว แต่ยังส่งทดสอบแจ้งเตือนไม่สำเร็จ กรุณาเปิดแจ้งเตือนอีกครั้ง',
    )
  }
  return result.subscription
}
