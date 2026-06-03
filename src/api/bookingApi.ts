import { httpClient, isApiFallbackEnabled } from './httpClient'
import { buildMockAvailability, createMockBooking, mockServices } from '../data/mockBooking'
import type { ApiEnvelope, AvailabilitySlot, Booking, CreateBookingPayload, ServiceItem } from '../types/booking'

const withFallback = async <T>(request: () => Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await request()
  } catch (error) {
    if (!isApiFallbackEnabled) {
      throw error
    }
    return fallback()
  }
}

export const bookingApi = {
  listServices: () =>
    withFallback(
      async () => {
        const response = await httpClient.get<ApiEnvelope<ServiceItem[]>>('/services')
        return response.data.data
      },
      () => mockServices,
    ),

  listAvailability: (serviceId: string, date: string) =>
    withFallback(
      async () => {
        const response = await httpClient.get<ApiEnvelope<AvailabilitySlot[]>>('/availability', {
          params: { serviceId, date },
        })
        return response.data.data
      },
      () => buildMockAvailability(),
    ),

  createBooking: (payload: CreateBookingPayload) =>
    withFallback(
      async () => {
        const response = await httpClient.post<ApiEnvelope<Booking>>('/bookings', payload)
        return response.data.data
      },
      () => createMockBooking(payload),
    ),
}
