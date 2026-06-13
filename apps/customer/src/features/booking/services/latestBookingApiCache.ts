import axios from 'axios'
import { bookingApi } from '../../../api/bookingApi'
import type { Booking } from '../../../types/booking'

const latestBookingCache = new Map<string, Booking>()
const latestBookingRequests = new Map<string, Promise<Booking>>()

export const isNotFoundError = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 404

export const isClosedBookingStatus = (status: Booking['status']) =>
  status === 'cancelled' || status === 'completed' || status === 'no_show'

export const forgetLatestBooking = (lineUserId: string) => {
  latestBookingCache.delete(lineUserId)
  latestBookingRequests.delete(lineUserId)
}

export const cacheLatestBooking = (lineUserId: string, booking: Booking) => {
  latestBookingCache.set(lineUserId, booking)
}

export const loadLatestBooking = (lineUserId: string, options?: { force?: boolean }) => {
  if (!options?.force) {
    const existingRequest = latestBookingRequests.get(lineUserId)
    if (existingRequest) {
      return existingRequest
    }
  }
  const request = bookingApi.latestBookingByLineUser(lineUserId)
    .then((booking) => {
      latestBookingCache.set(lineUserId, booking)
      return booking
    })
    .catch((error) => {
      latestBookingRequests.delete(lineUserId)
      throw error
    })
    .finally(() => {
      latestBookingRequests.delete(lineUserId)
    })
  latestBookingRequests.set(lineUserId, request)
  return request
}
