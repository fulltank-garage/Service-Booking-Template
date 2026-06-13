const pushVerificationStorageKey = 'service-booking-admin-push-verified'
const pushVerificationTtlMs = 24 * 60 * 60 * 1000

export type PushDeliveryReport = {
  totalSubscriptions?: number
  targetedSubscriptions?: number
  attempted: number
  sent: number
  expired: number
  failed: number
  lastStatusCode?: number
  lastError?: string
  recommendation?: string
}

export const urlBase64ToUint8Array = (base64String: string) => {
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

export const hasUsableSubscriptionKeys = (subscription: PushSubscription) => {
  const value = subscription.toJSON()
  return Boolean(value.endpoint && value.keys?.auth && value.keys?.p256dh)
}

export const getSubscriptionEndpoint = (subscription: PushSubscription) => subscription.toJSON().endpoint ?? ''

export const usesPublicKey = (subscription: PushSubscription, publicKey: string) =>
  arrayBufferToBase64Url(subscription.options.applicationServerKey ?? null) === normalizePublicKey(publicKey)

export const hasRecentPushVerification = (subscription: PushSubscription) => {
  const verification = readPushVerification()
  return (
    verification.endpoint === getSubscriptionEndpoint(subscription) &&
    typeof verification.verifiedAt === 'number' &&
    Date.now() - verification.verifiedAt < pushVerificationTtlMs
  )
}

export const rememberPushVerification = (subscription: PushSubscription) => {
  window.localStorage.setItem(
    pushVerificationStorageKey,
    JSON.stringify({ endpoint: getSubscriptionEndpoint(subscription), verifiedAt: Date.now() }),
  )
}

export const isPushDelivered = (report: PushDeliveryReport) => report.attempted > 0 && report.sent > 0

export const formatPushReport = (report: PushDeliveryReport) => {
  const recommendationLabels: Record<string, string> = {
    no_subscription: 'ยังไม่มีเครื่องที่สมัครรับแจ้งเตือน',
    subscription_not_found: 'ไม่พบ subscription ของเครื่องนี้ในระบบ',
    subscription_expired: 'subscription หมดอายุ ระบบจะสมัครใหม่ให้',
    vapid_or_permission_invalid: 'คีย์ VAPID หรือสิทธิ์แจ้งเตือนไม่ตรงกับ subscription ปัจจุบัน',
    provider_failed: 'ผู้ให้บริการ push ตอบกลับล้มเหลว',
    unknown: 'ยังไม่ทราบสาเหตุจากผู้ให้บริการ push',
  }
  const parts = [
    report.recommendation && recommendationLabels[report.recommendation] ? recommendationLabels[report.recommendation] : '',
    typeof report.totalSubscriptions === 'number' ? `subscriptions=${report.totalSubscriptions}` : '',
    typeof report.targetedSubscriptions === 'number' ? `targeted=${report.targetedSubscriptions}` : '',
    `attempted=${report.attempted}`,
    `sent=${report.sent}`,
    `failed=${report.failed}`,
    `expired=${report.expired}`,
  ].filter(Boolean)
  if (report.lastStatusCode) parts.push(`status=${report.lastStatusCode}`)
  if (report.lastError) parts.push(`error=${report.lastError}`)
  return parts.join(', ')
}

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
