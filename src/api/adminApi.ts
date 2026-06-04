import { httpClient } from './httpClient'
import type { AdminNotification, ApiEnvelope, Booking, BookingSettings, BookingStatus, ServiceItem } from '../types/admin'

type AdminLoginResponse = {
  email: string
  name: string
  token: string
  expiresAt: string
}

export type ServicePayload = {
  nameTh: string
  nameEn: string
  descriptionTh: string
  durationMinutes: number
  priceCents: number
  accentColor: string
  isActive: boolean
}

export const adminApi = {
  login: async (email: string, password: string) => {
    const response = await httpClient.post<ApiEnvelope<AdminLoginResponse>>('/admin/auth/login', { email, password })
    return response.data.data
  },

  logout: async () => {
    await httpClient.post('/admin/auth/logout')
  },

  listBookings: async () => {
    const response = await httpClient.get<ApiEnvelope<Booking[]>>('/admin/bookings')
    return response.data.data
  },

  listServices: async () => {
    const response = await httpClient.get<ApiEnvelope<ServiceItem[]>>('/admin/services')
    return response.data.data
  },

  createService: async (payload: ServicePayload) => {
    const response = await httpClient.post<ApiEnvelope<ServiceItem>>('/admin/services', payload)
    return response.data.data
  },

  updateService: async (id: string, payload: ServicePayload) => {
    const response = await httpClient.put<ApiEnvelope<ServiceItem>>(`/admin/services/${id}`, payload)
    return response.data.data
  },

  deleteService: async (id: string) => {
    await httpClient.delete(`/admin/services/${id}`)
  },

  updateBookingStatus: async (id: string, status: BookingStatus) => {
    const response = await httpClient.put<ApiEnvelope<Booking>>(`/admin/bookings/${id}/status`, { status })
    return response.data.data
  },

  getBookingSettings: async () => {
    const response = await httpClient.get<ApiEnvelope<BookingSettings>>('/admin/booking-settings')
    return response.data.data
  },

  updateBookingSettings: async (payload: BookingSettings) => {
    const response = await httpClient.put<ApiEnvelope<BookingSettings>>('/admin/booking-settings', payload)
    return response.data.data
  },

  listNotifications: async () => {
    const response = await httpClient.get<ApiEnvelope<AdminNotification[]>>('/admin/notifications')
    return response.data.data
  },

  markNotificationRead: async (id: string) => {
    const response = await httpClient.put<ApiEnvelope<AdminNotification>>(`/admin/notifications/${id}/read`)
    return response.data.data
  },

  getPushPublicKey: async () => {
    const response = await httpClient.get<{ configured: boolean; publicKey: string }>('/admin/push/public-key')
    return response.data
  },

  subscribePush: async (subscription: PushSubscriptionJSON) => {
    await httpClient.post('/admin/push/subscribe', subscription)
    return true
  },
}
