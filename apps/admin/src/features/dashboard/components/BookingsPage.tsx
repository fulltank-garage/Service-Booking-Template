import type { BookingPayload } from '../../../api/adminApi'
import type { Booking, BookingSettings, BookingStatus, ServiceItem } from '../../../types/admin'
import { BookingsCard } from './BookingsCard'

export function BookingsPage({
  bookingSettings,
  bookings,
  query,
  selectedDate,
  services,
  simpleMode,
  statusFilter,
  onCreateBooking,
  onDeleteBooking,
  onExportBookings,
  onNextDay,
  onPreviousDay,
  onQueryChange,
  onStatusFilterChange,
  onStatusChange,
  onUpdateBooking,
}: {
  bookingSettings: BookingSettings | null
  bookings: Booking[]
  query: string
  selectedDate: string
  services: ServiceItem[]
  simpleMode: boolean
  statusFilter: BookingStatus | 'all'
  onCreateBooking: (payload: Omit<BookingPayload, 'status'>) => Promise<void>
  onDeleteBooking: (booking: Booking) => void
  onExportBookings: () => void | Promise<void>
  onNextDay: () => void
  onPreviousDay: () => void
  onQueryChange: (query: string) => void
  onStatusFilterChange: (status: BookingStatus | 'all') => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void | Promise<void>
  onUpdateBooking: (booking: Booking, payload: BookingPayload) => Promise<void>
}) {
  return (
    <BookingsCard
      bookings={bookings}
      bookingSettings={bookingSettings}
      query={query}
      selectedDate={selectedDate}
      services={services}
      simpleMode={simpleMode}
      statusFilter={statusFilter}
      onCreateBooking={onCreateBooking}
      onDeleteBooking={onDeleteBooking}
      onExportBookings={onExportBookings}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
      onQueryChange={onQueryChange}
      onStatusFilterChange={onStatusFilterChange}
      onStatusChange={onStatusChange}
      onUpdateBooking={onUpdateBooking}
    />
  )
}
