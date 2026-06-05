import { bookingApi } from '../../api/bookingApi'
import type { BookingRules, ServiceItem } from '../../types/booking'

type BookingBootstrap = {
  services: ServiceItem[]
  rules: BookingRules
}

let bookingBootstrapCache: BookingBootstrap | null = null
let bookingBootstrapRequest: Promise<BookingBootstrap> | null = null

export const getBookingBootstrapCache = () => bookingBootstrapCache

export const preloadBookingBootstrap = () => {
  bookingBootstrapRequest ??= Promise.all([bookingApi.listServices(), bookingApi.getBookingRules()])
    .then(([services, rules]) => {
      bookingBootstrapCache = { services, rules }
      return bookingBootstrapCache
    })
    .catch((error) => {
      bookingBootstrapRequest = null
      throw error
    })
  return bookingBootstrapRequest
}

export const resetBookingBootstrapForTests = () => {
  bookingBootstrapCache = null
  bookingBootstrapRequest = null
}
