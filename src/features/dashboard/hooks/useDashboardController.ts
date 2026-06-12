import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adminApi } from '../../../api/adminApi'
import type { RealtimeStatus } from '../../../hooks/useAdminRealtime'
import { todayISO } from '../../../utils/dateFormat'
import type { AdminNotification, Booking, BookingDailySummary, BookingSettings, BookingStatus, PushHealthReport, ServiceItem } from '../../../types/admin'
import { refreshPushSubscription, registerAdminServiceWorker } from '../../notifications/pushNotifications'
import { demoBookingSetupStorageKey, simpleModeStorageKey, type AdminPage } from '../constants/dashboardOptions'
import { sortBookingsByNewestCreated } from '../utils/bookingCollections'
import { useBookingManagementActions } from './useBookingManagementActions'
import { useDashboardRealtime } from './useDashboardRealtime'
import { resetPageScroll } from '../utils/formatters'

export function useDashboardController(hasPendingAppUpdate: boolean) {
  const [activePage, setActivePage] = useState<AdminPage>('bookings')
    const [isNavOpen, setIsNavOpen] = useState(false)
    const [isSimpleMode] = useState(() => window.localStorage.getItem(simpleModeStorageKey) !== 'false')
    const [hasCompletedDemoBooking, setHasCompletedDemoBooking] = useState(() => window.localStorage.getItem(demoBookingSetupStorageKey) === 'true')
    const [bookings, setBookings] = useState<Booking[]>([])
    const [services, setServices] = useState<ServiceItem[]>([])
    const [notifications, setNotifications] = useState<AdminNotification[]>([])
    const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null)
    const [dailySummary, setDailySummary] = useState<BookingDailySummary | null>(null)
    const [pushHealth, setPushHealth] = useState<PushHealthReport | null>(null)
    const [selectedBookingDate, setSelectedBookingDate] = useState(todayISO)
    const [bookingQuery, setBookingQuery] = useState('')
    const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | 'all'>('all')
    const [isLoading, setIsLoading] = useState(true)
    const [shouldShowDataSkeleton, setShouldShowDataSkeleton] = useState(false)
    const hasLoadedDataRef = useRef(false)
    const knownNotificationIdsRef = useRef<Set<string>>(new Set())
    const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
    const [latestRealtimeAt, setLatestRealtimeAt] = useState<Date | null>(null)
    const [notice, setNotice] = useState('')
  
    const showNotificationNotice = useCallback((notification: AdminNotification) => {
      const isNewBooking = notification.type === 'booking.created'
      const message = isNewBooking ? 'มีคิวจองใหม่' : notification.title
      setNotice(message)
    }, [])
  
    const loadData = useCallback(async () => {
      if (!hasLoadedDataRef.current) {
        setIsLoading(true)
      }
  
      try {
        const [bookingItems, notificationItems, serviceItems, settings, summaryItems, pushHealthReport] = await Promise.all([
          adminApi.listBookings({ date: selectedBookingDate, query: bookingQuery, status: bookingStatusFilter }),
          adminApi.listNotifications(),
          adminApi.listServices(),
          adminApi.getBookingSettings(),
          adminApi.getBookingSummary(todayISO()),
          adminApi.getPushHealth(),
        ])
        const newBookingNotification = hasLoadedDataRef.current
          ? notificationItems.find(
              (notification) =>
                notification.type === 'booking.created' &&
                !notification.isRead &&
                !knownNotificationIdsRef.current.has(notification.id),
            )
          : undefined
  
        setBookings(sortBookingsByNewestCreated(bookingItems))
        setServices(serviceItems)
        setNotifications(notificationItems)
        setBookingSettings(settings)
        setDailySummary(summaryItems)
        setPushHealth(pushHealthReport)
        setLatestRealtimeAt(new Date())
        knownNotificationIdsRef.current = new Set(notificationItems.map((notification) => notification.id))
        hasLoadedDataRef.current = true
        if (newBookingNotification) {
          showNotificationNotice(newBookingNotification)
        }
      } catch {
        setNotice('')
      } finally {
        setIsLoading(false)
      }
    }, [bookingQuery, bookingStatusFilter, selectedBookingDate, showNotificationNotice])
  
    useEffect(() => {
      const timer = window.setTimeout(() => setShouldShowDataSkeleton(isLoading), isLoading ? 180 : 0)
      return () => window.clearTimeout(timer)
    }, [isLoading])
  
    useEffect(() => {
      const timer = window.setTimeout(() => {
        void loadData()
        void registerAdminServiceWorker()
          .then(() => refreshPushSubscription())
          .catch((error) => {
            setNotice(error instanceof Error ? error.message : 'ซิงก์แจ้งเตือนไม่สำเร็จ')
          })
      }, 0)
  
      return () => {
        window.clearTimeout(timer)
      }
    }, [loadData])
  
    const { refreshDailySummary } = useDashboardRealtime({
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
    })
  
    useEffect(() => {
      if (hasPendingAppUpdate) {
        const timer = window.setTimeout(() => setNotice('มีเวอร์ชันใหม่พร้อมอัปเดต'), 0)
        return () => window.clearTimeout(timer)
      }
      return undefined
    }, [hasPendingAppUpdate])
  
    const summary = useMemo(() => {
      const pending = bookings.filter((booking) => booking.status === 'pending').length
      const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length
      const unread = notifications.filter((notification) => !notification.isRead).length
      return { pending, confirmed, unread, total: bookings.length }
    }, [bookings, notifications])
  
    const setupProgress = useMemo(() => {
      const items = [
        { label: 'เพิ่มบริการแรก', done: services.length > 0 },
        { label: 'ตั้งเวลาเปิดปิดร้าน', done: Boolean(bookingSettings?.openTime && bookingSettings?.closeTime) },
        { label: 'ทดลองสร้างคิว', done: hasCompletedDemoBooking || bookings.length > 0 },
        { label: 'เปิดแจ้งเตือนโทรศัพท์', done: pushHealth?.recommendation === 'push_ready' },
      ]
      const doneCount = items.filter((item) => item.done).length
      return { items, doneCount, total: items.length }
    }, [bookingSettings, bookings.length, hasCompletedDemoBooking, pushHealth, services.length])
  
    const handleCompleteDemoBooking = () => {
      window.localStorage.setItem(demoBookingSetupStorageKey, 'true')
      setHasCompletedDemoBooking(true)
      setNotice('บันทึกว่าเคยทดลองเพิ่มคิวแล้ว')
    }
  
    const {
      handleCreateBooking,
      handleDeleteBooking,
      handleExportBookings,
      handleStatusChange,
      handleUpdateBooking,
    } = useBookingManagementActions({
      bookingQuery,
      bookingStatusFilter,
      loadData,
      refreshDailySummary,
      selectedBookingDate,
      setBookings,
      setNotice,
    })
  
    const handleChangePage = (page: AdminPage) => {
      setActivePage(page)
      setIsNavOpen(false)
      window.requestAnimationFrame(resetPageScroll)
    }

  return {
    activePage, isNavOpen, isSimpleMode, bookings, services, notifications,
    bookingSettings, dailySummary, pushHealth, selectedBookingDate, bookingQuery,
    bookingStatusFilter, isLoading, shouldShowDataSkeleton, realtimeStatus,
    latestRealtimeAt, notice, setNotice, setIsNavOpen, setSelectedBookingDate,
    setBookingQuery, setBookingStatusFilter, setServices, setNotifications,
    setBookingSettings, summary, setupProgress, handleCompleteDemoBooking,
    handleStatusChange, handleDeleteBooking, handleUpdateBooking,
    handleCreateBooking, handleExportBookings, handleChangePage,
  }
}
