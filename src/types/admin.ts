export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type ServiceItem = {
  id: string
  nameTh: string
  nameEn: string
  durationMinutes: number
  accentColor: string
}

export type Booking = {
  id: string
  bookingCode: string
  customerName: string
  phone: string
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

export type ApiEnvelope<T> = {
  data: T
}
