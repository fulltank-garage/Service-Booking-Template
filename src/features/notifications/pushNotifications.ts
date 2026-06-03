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

export const isPushNotificationSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const getCurrentPushPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

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

  const publicKey = await adminApi.getPushPublicKey()
  if (!publicKey.configured || !publicKey.publicKey) {
    throw new Error('ยังไม่ได้ตั้งค่าการแจ้งเตือน')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน')
  }

  const registration = await registerServiceWorker()
  const currentSubscription = await registration.pushManager.getSubscription()
  if (currentSubscription) {
    await adminApi.subscribePush(currentSubscription.toJSON())
    return currentSubscription
  }

  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(publicKey.publicKey),
    userVisibleOnly: true,
  })
  await adminApi.subscribePush(subscription.toJSON())
  return subscription
}
