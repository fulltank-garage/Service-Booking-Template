import { httpClient } from './httpClient'
import type { ApiEnvelope, AvailabilitySlot, Booking, CreateBookingPayload, ServiceItem } from '../types/booking'

export const bookingApi = {
  listServices: async () => {
    const response = await httpClient.get<ApiEnvelope<ServiceItem[]>>('/services')
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
}
