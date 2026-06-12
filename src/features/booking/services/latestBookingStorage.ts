import type { Booking } from '../../../types/booking'

const latestBookingStorageKey = 'bookingQueue.latestBooking'

export const readLatestBooking = () => {
  try {
    const raw = window.localStorage.getItem(latestBookingStorageKey)
    return raw ? (JSON.parse(raw) as Booking) : null
  } catch {
    return null
  }
}

export const saveLatestBooking = (booking: Booking) => {
  try {
    window.localStorage.setItem(latestBookingStorageKey, JSON.stringify(booking))
  } catch {
    // Ignore storage failures inside restricted LIFF browsers.
  }
}

export const clearLatestBooking = () => {
  try {
    window.localStorage.removeItem(latestBookingStorageKey)
  } catch {
    // Ignore storage failures inside restricted LIFF browsers.
  }
}
