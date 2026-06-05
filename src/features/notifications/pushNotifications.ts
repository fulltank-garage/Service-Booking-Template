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

const hasUsableSubscriptionKeys = (subscription: PushSubscription) => {
  const value = subscription.toJSON()
  return Boolean(value.endpoint && value.keys?.auth && value.keys?.p256dh)
}

const saveSubscription = async (subscription: PushSubscription) => {
  if (!hasUsableSubscriptionKeys(subscription)) {
    throw new Error('ข้อมูลแจ้งเตือนเดิมไม่สมบูรณ์ กรุณาเปิดแจ้งเตือนอีกครั้ง')
  }
  await adminApi.subscribePush(subscription.toJSON())
}

const subscribeWithPublicKey = async (registration: ServiceWorkerRegistration) => {
  const publicKey = await adminApi.getPushPublicKey()
  if (!publicKey.configured || !publicKey.publicKey) {
    throw new Error('เปิดสิทธิ์แจ้งเตือนแล้ว แต่ระบบยังไม่ได้ตั้งค่าคีย์ส่งแจ้งเตือนครบ')
  }

  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(publicKey.publicKey),
    userVisibleOnly: true,
  })
  await saveSubscription(subscription)
  return subscription
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
  const currentSubscription = await registration.pushManager.getSubscription()
  if (currentSubscription) {
    if (!hasUsableSubscriptionKeys(currentSubscription)) {
      await currentSubscription.unsubscribe().catch(() => false)
      return subscribeWithPublicKey(registration)
    }
    await saveSubscription(currentSubscription)
    return currentSubscription
  }

  return subscribeWithPublicKey(registration)
}

export const refreshPushSubscription = async () => {
  if (!isPushNotificationSupported() || getCurrentPushPermission() !== 'granted') {
    return null
  }

  const registration = await registerServiceWorker()
  const currentSubscription = await registration.pushManager.getSubscription()
  if (!currentSubscription) {
    return enablePushNotifications()
  }
  if (!hasUsableSubscriptionKeys(currentSubscription)) {
    await currentSubscription.unsubscribe().catch(() => false)
    return subscribeWithPublicKey(registration)
  }
  await saveSubscription(currentSubscription)
  return currentSubscription
}
