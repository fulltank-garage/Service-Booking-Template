import { httpClient } from './httpClient'
import type { ApiEnvelope, AvailabilitySlot, Booking, BookingRules, CreateBookingPayload, RescheduleBookingPayload, ServiceItem } from '../types/booking'

export const bookingApi = {
  listServices: async () => {
    const response = await httpClient.get<ApiEnvelope<ServiceItem[]>>('/services')
    return response.data.data
  },

  getBookingRules: async () => {
    const response = await httpClient.get<ApiEnvelope<BookingRules>>('/booking-rules')
    return response.data.data
  },

  listAvailability: async (serviceId: string, date: string) => {
    const response = await httpClient.get<ApiEnvelope<AvailabilitySlot[]>>('/availability', {
      params: { serviceId, date },
    })
    return response.data.data
  },

  createBooking: async (payload: CreateBookingPayload) => {
    const response = await httpClient.post<ApiEnvelope<Booking>>('/bookings', payload)
    return response.data.data
  },

  latestBookingByLineUser: async (lineUserId: string) => {
    const response = await httpClient.get<ApiEnvelope<Booking>>('/bookings/latest', {
      params: { lineUserId },
    })
    return response.data.data
  },

  cancelBooking: async (bookingId: string, lineUserId: string) => {
    await httpClient.post(`/bookings/${bookingId}/cancel`, { lineUserId })
  },

  rescheduleBooking: async (bookingId: string, payload: RescheduleBookingPayload) => {
    const response = await httpClient.put<ApiEnvelope<Booking>>(`/bookings/${bookingId}/reschedule`, payload)
    return response.data.data
  },
}
