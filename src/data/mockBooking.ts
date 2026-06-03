import type { AvailabilitySlot, Booking, CreateBookingPayload, ServiceItem } from '../types/booking'

export const mockServices: ServiceItem[] = [
  {
    id: 'service-consult',
    nameTh: 'ปรึกษาบริการ',
    nameEn: 'Service Consultation',
    descriptionTh: 'เลือกเวลาปรึกษาเบื้องต้นก่อนเข้าใช้บริการจริง',
    durationMinutes: 30,
    priceCents: 0,
    accentColor: '#0F766E',
    isActive: true,
  },
  {
    id: 'service-standard',
    nameTh: 'เข้าใช้บริการมาตรฐาน',
    nameEn: 'Standard Service',
    descriptionTh: 'จองคิวสำหรับบริการหลัก พร้อมรองรับการยืนยันจากทีมงาน',
    durationMinutes: 60,
    priceCents: 50000,
    accentColor: '#F97363',
    isActive: true,
  },
  {
    id: 'service-express',
    nameTh: 'บริการเร่งด่วน',
    nameEn: 'Express Service',
    descriptionTh: 'คิวเร่งด่วนสำหรับงานที่ต้องการเวลาตอบสนองเร็ว',
    durationMinutes: 45,
    priceCents: 80000,
    accentColor: '#2563EB',
    isActive: true,
  },
]

export const buildMockAvailability = (): AvailabilitySlot[] => {
  const slots: AvailabilitySlot[] = []
  const start = 9 * 60
  for (let index = 0; index < 16; index += 1) {
    const minutes = start + index * 30
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const booked = index % 5 === 0 ? 3 : index % 3
    slots.push({
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      booked,
      capacity: 3,
      available: booked < 3,
    })
  }
  return slots
}

export const createMockBooking = (payload: CreateBookingPayload): Booking => ({
  id: crypto.randomUUID(),
  bookingCode: `SB-${payload.bookingDate.replaceAll('-', '')}-${Math.floor(Math.random() * 9000 + 1000)}`,
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...payload,
})
