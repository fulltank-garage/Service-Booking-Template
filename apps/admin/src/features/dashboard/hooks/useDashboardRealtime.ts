import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { adminApi } from '../../../api/adminApi'
import { useAdminRealtime, type RealtimeStatus } from '../../../hooks/useAdminRealtime'
import { todayISO } from '../../../utils/dateFormat'
import type { AdminNotification, AdminRealtimeEvent, Booking, BookingDailySummary, BookingSettings, BookingStatus, ServiceItem } from '../../../types/admin'
import { bookingMatchesFilters, sortBookingsByNewestCreated, upsertById } from '../utils/bookingCollections'

type DashboardRealtimeOptions = {
  bookingQuery: string
  bookingStatusFilter: BookingStatus | 'all'
  knownNotificationIdsRef: MutableRefObject<Set<string>>
  loadData: () => Promise<void>
  selectedBookingDate: string
  setBookingSettings: Dispatch<SetStateAction<BookingSettings | null>>
  setBookings: Dispatch<SetStateAction<Booking[]>>
  setDailySummary: Dispatch<SetStateAction<BookingDailySummary | null>>
  setLatestRealtimeAt: Dispatch<SetStateAction<Date | null>>
  setNotifications: Dispatch<SetStateAction<AdminNotification[]>>
  setRealtimeStatus: Dispatch<SetStateAction<RealtimeStatus>>
  setServices: Dispatch<SetStateAction<ServiceItem[]>>
  showNotificationNotice: (notification: AdminNotification) => void
}

export function useDashboardRealtime({
  bookingQuery,
  bookingStatusFilter,
  knownNotificationIdsRef,
  loadData,
  selectedBookingDate,
  setBookingSettings,
  setBookings,
  setDailySummary,
  setLatestRealtimeAt,
  setNotifications,
  setRealtimeStatus,
  setServices,
  showNotificationNotice,
}: DashboardRealtimeOptions) {
  const handleRealtimeNotification = useCallback((notification: AdminNotification) => {
    knownNotificationIdsRef.current.add(notification.id)
    setNotifications((current) => upsertById(current, notification))
    showNotificationNotice(notification)
  }, [knownNotificationIdsRef, setNotifications, showNotificationNotice])

  const refreshDailySummary = useCallback(() => {
    void adminApi.getBookingSummary(todayISO()).then(setDailySummary).catch(() => undefined)
  }, [setDailySummary])

  useAdminRealtime({
    onEvent: useCallback(
      (event: AdminRealtimeEvent) => {
        setLatestRealtimeAt(new Date())
        if (event.type === 'booking.deleted' || event.type === 'booking.cancelled') {
          refreshDailySummary()
          const bookingId = event.booking?.id ?? event.bookingId
          if (bookingId) setBookings((current) => current.filter((booking) => booking.id !== bookingId))
          else void loadData()
        } else if (event.booking) {
          refreshDailySummary()
          const incomingBooking = event.booking as Booking
          const filters = { date: selectedBookingDate, query: bookingQuery, status: bookingStatusFilter }
          setBookings((current) =>
            sortBookingsByNewestCreated(
              bookingMatchesFilters(incomingBooking, filters)
                ? upsertById(current, incomingBooking)
                : current.filter((booking) => booking.id !== incomingBooking.id),
            ),
          )
        }
        if ((event.type === 'service.created' || event.type === 'service.updated') && event.service) {
          setServices((current) => upsertById(current, event.service as ServiceItem))
        }
        if (event.type === 'service.deleted') {
          if (event.service?.id) setServices((current) => current.filter((service) => service.id !== event.service?.id))
          else void loadData()
        }
        if (event.type === 'booking_settings.updated') {
          if (event.settings) setBookingSettings(event.settings)
          else void loadData()
        }
        if ((event.type === 'booking.created' || event.type === 'booking.updated') && event.booking?.bookingDate !== selectedBookingDate) {
          void loadData()
        }
        if (event.notification) {
          if (event.type === 'notification.read') {
            setNotifications((current) =>
              current.map((notification) => (notification.id === event.notification?.id ? event.notification : notification)),
            )
          } else handleRealtimeNotification(event.notification)
        }
        if ((event.type === 'booking.created' || event.type === 'booking.updated') && !event.booking) void loadData()
      },
      [bookingQuery, bookingStatusFilter, handleRealtimeNotification, loadData, refreshDailySummary, selectedBookingDate, setBookingSettings, setBookings, setLatestRealtimeAt, setNotifications, setServices],
    ),
    onLegacyNotification: handleRealtimeNotification,
    onRefresh: loadData,
    onStatus: setRealtimeStatus,
  })

  return { refreshDailySummary }
}
