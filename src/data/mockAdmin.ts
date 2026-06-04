import type { AdminNotification, Booking, ServiceItem } from '../types/admin'

export const mockServices: ServiceItem[] = [
  {
    id: 'service-standard',
    nameTh: 'เข้าใช้บริการมาตรฐาน',
    nameEn: 'Standard Service',
    descriptionTh: 'บริการหลักสำหรับลูกค้าที่ต้องการเข้ารับบริการทั่วไป',
    durationMinutes: 60,
    priceCents: 120000,
    accentColor: '#FF008C',
    isActive: true,
  },
  {
    id: 'service-consult',
    nameTh: 'ปรึกษาบริการ',
    nameEn: 'Service Consultation',
    descriptionTh: 'นัดหมายเพื่อประเมินความต้องการและแนะนำบริการที่เหมาะสม',
    durationMinutes: 30,
    priceCents: 0,
    accentColor: '#F5FF00',
    isActive: true,
  },
]

export const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    bookingCode: 'SB-20260610-1201',
    customerName: 'สมชาย ใจดี',
    phone: '0890000000',
    bookingDate: '2026-06-10',
    slotTime: '10:00',
    status: 'pending',
    createdAt: new Date().toISOString(),
    service: {
      ...mockServices[0],
    },
  },
  {
    id: 'booking-2',
    bookingCode: 'SB-20260610-1202',
    customerName: 'อรทัย วัฒนา',
    phone: '0811111111',
    bookingDate: '2026-06-10',
    slotTime: '13:30',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    service: {
      ...mockServices[1],
    },
  },
]

export const mockNotifications: AdminNotification[] = [
  {
    id: 'notice-1',
    type: 'booking.created',
    title: 'มีคิวจองใหม่',
    body: 'สมชาย ใจดี จองเวลา 10:00 วันที่ 2026-06-10',
    url: '/bookings',
    isRead: false,
    bookingId: 'booking-1',
    createdAt: new Date().toISOString(),
  },
]
