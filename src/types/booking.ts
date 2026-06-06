export type ServiceItem = {
  id: string
  nameTh: string
  nameEn: string
  descriptionTh: string
  durationMinutes: number
  priceCents: number
  accentColor: string
  isActive: boolean
}

export type AvailabilitySlot = {
  time: string
  booked: number
  capacity: number
  available: boolean
}

export type Booking = {
  id: string
  bookingCode: string
  serviceId: string
  service?: ServiceItem
  customerName: string
  phone: string
  lineUserId?: string
  notes?: string
  bookingDate: string
  slotTime: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  createdAt: string
}

export type BookingBlackoutDate = {
  id?: string
  date: string
  reason?: string
}

export type BookingRules = {
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

export type CreateBookingPayload = {
  serviceId: string
  customerName: string
  phone: string
  lineUserId?: string
  bookingDate: string
  slotTime: string
  notes?: string
}

export type RescheduleBookingPayload = {
  lineUserId: string
  bookingDate: string
  slotTime: string
  notes?: string
}

export type ApiEnvelope<T> = {
  data: T
}
