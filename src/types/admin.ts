export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type ServiceItem = {
  id: string
  nameTh: string
  nameEn: string
  descriptionTh?: string
  durationMinutes: number
  priceCents: number
  accentColor: string
  isActive: boolean
}

export type Booking = {
  id: string
  serviceId: string
  bookingCode: string
  customerName: string
  phone: string
  lineUserId?: string
  notes?: string
  bookingDate: string
  slotTime: string
  status: BookingStatus
  service?: ServiceItem
  createdAt: string
  noShowCount?: number
}

export type DailyBookingSummary = {
  date: string
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
  total: number
}

export type BookingDailySummary = {
  today: DailyBookingSummary
  tomorrow: DailyBookingSummary
}

export type PushHealthReport = {
  configured: boolean
  validKeys: boolean
  senderReady: boolean
  subscriptionCount: number
  lastStatusCode?: number
  lastError?: string
  recommendation: string
}

export type AdminNotification = {
  id: string
  type: string
  title: string
  body: string
  url: string
  isRead: boolean
  bookingId?: string
  createdAt: string
}

export type BookingBlackoutDate = {
  id?: string
  date: string
  reason?: string
}

export type BookingSettings = {
  openTime: string
  closeTime: string
  slotIntervalMinutes: number
  slotCapacity: number
  closedWeekdays: string
  minAdvanceHours: number
  maxAdvanceDays: number
  reminderLeadMinutes: number
  bufferMinutes: number
  blackoutDates: BookingBlackoutDate[]
}

export type AdminRealtimeEvent = {
  type:
    | 'booking.created'
    | 'booking.updated'
    | 'booking.deleted'
    | 'booking.cancelled'
    | 'service.created'
    | 'service.updated'
    | 'service.deleted'
    | 'booking_settings.updated'
    | 'notification.created'
    | 'notification.read'
    | 'dashboard.summary.updated'
    | string
  notification?: AdminNotification
  booking?: Booking
  bookingId?: string
  service?: ServiceItem
  settings?: BookingSettings
}

export type ApiEnvelope<T> = {
  data: T
}
