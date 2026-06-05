export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

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
  blackoutDates: BookingBlackoutDate[]
}

export type AdminRealtimeEvent = {
  type: 'booking.created' | 'booking.updated' | 'notification.created' | 'notification.read' | 'dashboard.summary.updated' | string
  notification?: AdminNotification
  booking?: Booking
}

export type ApiEnvelope<T> = {
  data: T
}
