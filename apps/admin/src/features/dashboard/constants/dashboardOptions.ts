export const pageLabels = {
  setup: 'เริ่มใช้งานร้าน',
  overview: 'จัดการคิวจองบริการ',
  bookings: 'รายการจอง',
  services: 'บริการของร้าน',
  notifications: 'รายการแจ้งเตือน',
  settings: 'การตั้งค่าร้าน',
} as const

export type AdminPage = keyof typeof pageLabels

export const simpleModeStorageKey = 'service-booking-admin-simple-mode'
export const demoBookingSetupStorageKey = 'service-booking-admin-demo-booking-complete'

export const shopTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2)
  const minutes = index % 2 === 0 ? '00' : '30'
  const value = `${String(hours).padStart(2, '0')}:${minutes}`
  return { value, label: value }
})

export const reminderLeadOptions = [
  { value: 30, label: '30 นาทีก่อนนัด' },
  { value: 60, label: '1 ชั่วโมงก่อนนัด' },
  { value: 120, label: '2 ชั่วโมงก่อนนัด' },
  { value: 180, label: '3 ชั่วโมงก่อนนัด' },
  { value: 360, label: '6 ชั่วโมงก่อนนัด' },
  { value: 720, label: '12 ชั่วโมงก่อนนัด' },
  { value: 1440, label: '1 วันก่อนนัด' },
  { value: 2880, label: '2 วันก่อนนัด' },
]

export const bufferMinuteOptions = [
  { value: 0, label: 'ไม่เว้นพัก' },
  { value: 5, label: '5 นาที' },
  { value: 10, label: '10 นาที' },
  { value: 15, label: '15 นาที' },
  { value: 30, label: '30 นาที' },
]

export const SIDEBAR_WIDTH = 280
export const SAFE_AREA_TOP = 'env(safe-area-inset-top, 0px)'
export const MOBILE_TOPBAR_OFFSET = 'calc(72px + env(safe-area-inset-top, 0px))'
export const MOBILE_FLOATING_TOP = 'calc(92px + env(safe-area-inset-top, 0px))'
