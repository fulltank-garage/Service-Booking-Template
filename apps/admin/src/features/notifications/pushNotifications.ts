import { adminApi } from '../../api/adminApi'
import {
  formatPushReport,
  hasRecentPushVerification,
  hasUsableSubscriptionKeys,
  isPushDelivered,
  rememberPushVerification,
  urlBase64ToUint8Array,
  usesPublicKey,
} from './pushSubscriptionUtils'

const serviceWorkerPath = '/admin-sw.js'

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
