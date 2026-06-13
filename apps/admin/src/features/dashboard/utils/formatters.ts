import type { AdminNotification } from '../../../types/admin'
import { formatThaiDateLabel } from '../../../utils/dateFormat'

export const formatThaiPrice = (priceCents: number) =>
  `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(priceCents / 100)} บาท`

export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export const resetPageScroll = () => {
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  if (!navigator.userAgent.includes('jsdom')) {
    window.scrollTo({ top: 0, left: 0 })
  }
}

export const formatNotificationTimestamp = (createdAt?: string) => {
  if (!createdAt) {
    return 'ไม่พบเวลาการแจ้งเตือน'
  }

  const createdDate = new Date(createdAt)
  if (Number.isNaN(createdDate.getTime())) {
    return 'ไม่พบเวลาการแจ้งเตือน'
  }

  return `${formatThaiDateLabel(createdDate.toISOString().slice(0, 10))} ${new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdDate)}`
}

const notificationTypeLabels: Record<string, string> = {
  'booking.created': 'มีคิวใหม่',
  'booking.updated': 'มีการแก้ไขคิว',
  'booking.cancelled': 'มีคิวยกเลิก',
  'booking.deleted': 'มีการลบคิว',
  'service.created': 'เพิ่มบริการแล้ว',
  'service.updated': 'แก้ไขบริการแล้ว',
  'service.deleted': 'ลบบริการแล้ว',
  'booking_settings.updated': 'แก้ไขตั้งค่าร้านแล้ว',
}

export const formatShopNotificationTitle = (notification: AdminNotification) =>
  notificationTypeLabels[notification.type] ?? notification.title

export const formatShopNotificationBody = (body: string) =>
  body
    .replaceAll('pending', 'รอจัดการ')
    .replaceAll('confirmed', 'ยืนยันแล้ว')
    .replaceAll('completed', 'เสร็จสิ้น')
    .replaceAll('cancelled', 'ยกเลิก')
    .replaceAll('no_show', 'ไม่มาตามนัด')
    .replaceAll('subscription', 'เครื่องที่เปิดแจ้งเตือน')
    .replaceAll('VAPID', 'คีย์แจ้งเตือน')
