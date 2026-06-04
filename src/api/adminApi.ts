import { httpClient, isApiFallbackEnabled } from './httpClient'
import { mockBookings, mockNotifications, mockServices } from '../data/mockAdmin'
import type { AdminNotification, ApiEnvelope, Booking, BookingStatus, ServiceItem } from '../types/admin'
import axios from 'axios'

type AdminLoginResponse = {
  email: string
  name: string
  token: string
  expiresAt: string
}

const canFallback = (error: unknown) => {
  if (!isApiFallbackEnabled) return false
  if (axios.isAxiosError(error) && error.response?.status === 401) return false
  return true
}

const withFallback = async <T>(request: () => Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await request()
  } catch (error) {
    if (!canFallback(error)) {
      throw error
    }
    return fallback()
  }
}

export const adminApi = {
  login: async (email: string, password: string) => {
    const response = await httpClient.post<ApiEnvelope<AdminLoginResponse>>('/admin/auth/login', { email, password })
    return response.data.data
  },

  listBookings: () =>
    withFallback(
      async () => {
        const response = await httpClient.get<ApiEnvelope<Booking[]>>('/admin/bookings')
        return response.data.data
      },
      () => mockBookings,
    ),

  listServices: () =>
    withFallback(
      async () => {
        const response = await httpClient.get<ApiEnvelope<ServiceItem[]>>('/admin/services')
        return response.data.data
      },
      () => mockServices,
    ),

  updateBookingStatus: (id: string, status: BookingStatus) =>
    withFallback(
      async () => {
        const response = await httpClient.put<ApiEnvelope<Booking>>(`/admin/bookings/${id}/status`, { status })
        return response.data.data
      },
      () => mockBookings.find((booking) => booking.id === id) ?? mockBookings[0],
    ),

  listNotifications: () =>
    withFallback(
      async () => {
        const response = await httpClient.get<ApiEnvelope<AdminNotification[]>>('/admin/notifications')
        return response.data.data
      },
      () => mockNotifications,
    ),

  markNotificationRead: (id: string) =>
    withFallback(
      async () => {
        const response = await httpClient.put<ApiEnvelope<AdminNotification>>(`/admin/notifications/${id}/read`)
        return response.data.data
      },
      () => mockNotifications.find((item) => item.id === id) ?? mockNotifications[0],
    ),

  getPushPublicKey: () =>
    withFallback(
      async () => {
        const response = await httpClient.get<{ configured: boolean; publicKey: string }>('/admin/push/public-key')
        return response.data
      },
      () => ({ configured: false, publicKey: '' }),
    ),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    withFallback(
      async () => {
        await httpClient.post('/admin/push/subscribe', subscription)
        return true
      },
      () => true,
    ),
}
