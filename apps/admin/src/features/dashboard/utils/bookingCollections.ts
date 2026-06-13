import type { Booking, BookingStatus } from '../../../types/admin'

export const upsertById = <T extends { id: string }>(items: T[], nextItem: T) => {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id)
  if (existingIndex === -1) {
    return [nextItem, ...items]
  }
  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}

const getBookingCreatedTime = (booking: Booking) => {
  const createdTime = new Date(booking.createdAt).getTime()
  return Number.isNaN(createdTime) ? 0 : createdTime
}

export const sortBookingsByNewestCreated = (items: Booking[]) =>
  [...items].sort((first, second) => {
    const createdDiff = getBookingCreatedTime(second) - getBookingCreatedTime(first)
    if (createdDiff !== 0) {
      return createdDiff
    }
    return `${second.bookingDate} ${second.slotTime}`.localeCompare(`${first.bookingDate} ${first.slotTime}`)
  })

export const bookingMatchesFilters = (
  booking: Booking,
  filters: { date: string; query: string; status: BookingStatus | 'all' },
) => {
  if (booking.bookingDate !== filters.date) {
    return false
  }

  if (filters.status !== 'all' && booking.status !== filters.status) {
    return false
  }

  const normalizedQuery = filters.query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }

  return [booking.bookingCode, booking.customerName, booking.phone, booking.service?.nameTh, booking.service?.nameEn]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery))
}
