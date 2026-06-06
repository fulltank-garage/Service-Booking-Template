import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Portal,
  Select,
  Skeleton,
  Stack,
  Switch,
  type SwitchProps,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { overlay } from '../../theme/theme'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import LogoutIcon from '@mui/icons-material/Logout'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import WifiTetheringIcon from '@mui/icons-material/WifiTethering'
import { adminApi, type BookingPayload, type ServicePayload } from '../../api/adminApi'
import { BrandMark } from '../../components/BrandMark'
import { useAdminRealtime, type RealtimeStatus } from '../../hooks/useAdminRealtime'
import type { AdminNotification, AdminRealtimeEvent, Booking, BookingSettings, BookingStatus, ServiceItem } from '../../types/admin'
import { PushNotificationPrompt } from '../notifications/PushNotificationPrompt'
import { refreshPushSubscription, registerAdminServiceWorker } from '../notifications/pushNotifications'
import { addDaysToISODate, formatThaiDateLabel, todayISO } from '../../utils/dateFormat'

const statusLabels: Record<BookingStatus, string> = {
  pending: 'รอจัดการ',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  no_show: 'ไม่มาตามนัด',
}

const statusChipSx = {
  color: '#FFFFFF',
  '& .MuiChip-label': {
    color: '#FFFFFF',
  },
}

const statusChipTextSx = (status: BookingStatus) =>
  status === 'completed' || status === 'no_show'
    ? {
        color: '#111827',
        '& .MuiChip-label': {
          color: '#111827',
        },
      }
    : statusChipSx

const getBookingStatusAction = (status: BookingStatus) => {
  if (status === 'pending') {
    return { label: 'ยืนยัน', nextStatus: 'confirmed' as BookingStatus, disabled: false }
  }
  if (status === 'confirmed') {
    return { label: 'เสร็จสิ้น', nextStatus: 'completed' as BookingStatus, disabled: false }
  }
  return { label: status === 'completed' ? 'เสร็จสิ้น' : 'ยืนยัน', nextStatus: status, disabled: true }
}

const isClosedBookingStatus = (status: BookingStatus) =>
  status === 'completed' || status === 'cancelled' || status === 'no_show'

const pageLabels = {
  overview: 'จัดการคิวจองบริการ',
  bookings: 'รายการจอง',
  services: 'บริการของร้าน',
  notifications: 'รายการแจ้งเตือน',
  settings: 'การตั้งค่าร้าน',
} as const

const formatThaiPrice = (priceCents: number) =>
  `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(priceCents / 100)} บาท`

const digitsOnly = (value: string) => value.replace(/\D/g, '')

const resetPageScroll = () => {
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  if (!navigator.userAgent.includes('jsdom')) {
    window.scrollTo({ top: 0, left: 0 })
  }
}

const shopTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2)
  const minutes = index % 2 === 0 ? '00' : '30'
  const value = `${String(hours).padStart(2, '0')}:${minutes}`
  return { value, label: value }
})

const reminderLeadOptions = [
  { value: 30, label: '30 นาทีก่อนนัด' },
  { value: 60, label: '1 ชั่วโมงก่อนนัด' },
  { value: 120, label: '2 ชั่วโมงก่อนนัด' },
  { value: 180, label: '3 ชั่วโมงก่อนนัด' },
  { value: 360, label: '6 ชั่วโมงก่อนนัด' },
  { value: 720, label: '12 ชั่วโมงก่อนนัด' },
  { value: 1440, label: '1 วันก่อนนัด' },
  { value: 2880, label: '2 วันก่อนนัด' },
]

const bufferMinuteOptions = [
  { value: 0, label: 'ไม่เว้นพัก' },
  { value: 5, label: '5 นาที' },
  { value: 10, label: '10 นาที' },
  { value: 15, label: '15 นาที' },
  { value: 30, label: '30 นาที' },
]

const formatNotificationTimestamp = (createdAt?: string) => {
  if (!createdAt) {
    return 'ไม่พบเวลาการแจ้งเตือน'
  }

  const createdDate = new Date(createdAt)
  if (Number.isNaN(createdDate.getTime())) {
    return 'ไม่พบเวลาการแจ้งเตือน'
  }

  return `${formatThaiDateLabel(createdDate.toISOString().slice(0, 10))} ${new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdDate)}`
}

const upsertById = <T extends { id: string }>(items: T[], nextItem: T) => {
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

const sortBookingsByNewestCreated = (items: Booking[]) =>
  [...items].sort((first, second) => {
    const createdDiff = getBookingCreatedTime(second) - getBookingCreatedTime(first)
    if (createdDiff !== 0) {
      return createdDiff
    }
    return `${second.bookingDate} ${second.slotTime}`.localeCompare(`${first.bookingDate} ${first.slotTime}`)
  })

const bookingMatchesFilters = (
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

const SIDEBAR_WIDTH = 280
const SAFE_AREA_TOP = 'env(safe-area-inset-top, 0px)'
const MOBILE_TOPBAR_OFFSET = 'calc(72px + env(safe-area-inset-top, 0px))'
const MOBILE_FLOATING_TOP = 'calc(92px + env(safe-area-inset-top, 0px))'

const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#65C466',
        opacity: 1,
        border: 0,
        ...theme.applyStyles('dark', {
          backgroundColor: '#2ECA45',
        }),
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.grey[100],
      ...theme.applyStyles('dark', {
        color: theme.palette.grey[600],
      }),
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.7,
      ...theme.applyStyles('dark', {
        opacity: 0.3,
      }),
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 22,
    height: 22,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: '#E9E9EA',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
    ...theme.applyStyles('dark', {
      backgroundColor: '#39393D',
    }),
  },
}))

type AdminPage = keyof typeof pageLabels

type DashboardPageProps = {
  adminEmail: string
  adminName: string
  applyAppUpdate: () => void
  hasPendingAppUpdate: boolean
  onLogout: () => void
}

export function DashboardPage({ adminEmail, adminName, applyAppUpdate, hasPendingAppUpdate, onLogout }: DashboardPageProps) {
  const [activePage, setActivePage] = useState<AdminPage>('bookings')
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null)
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
      const [bookingItems, notificationItems, serviceItems, settings] = await Promise.all([
        adminApi.listBookings({ date: selectedBookingDate, query: bookingQuery, status: bookingStatusFilter }),
        adminApi.listNotifications(),
        adminApi.listServices(),
        adminApi.getBookingSettings(),
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

  const handleRealtimeNotification = useCallback((notification: AdminNotification) => {
    knownNotificationIdsRef.current.add(notification.id)
    setNotifications((current) => upsertById(current, notification))
    showNotificationNotice(notification)
  }, [showNotificationNotice])

  useAdminRealtime({
    onEvent: useCallback(
      (event: AdminRealtimeEvent) => {
        setLatestRealtimeAt(new Date())

        if (event.type === 'booking.deleted' || event.type === 'booking.cancelled') {
          const bookingId = event.booking?.id ?? event.bookingId
          if (bookingId) {
            setBookings((current) => current.filter((booking) => booking.id !== bookingId))
          } else {
            void loadData()
          }
        } else if (event.booking) {
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
          if (event.service?.id) {
            setServices((current) => current.filter((service) => service.id !== event.service?.id))
          } else {
            void loadData()
          }
        }

        if (event.type === 'booking_settings.updated') {
          if (event.settings) {
            setBookingSettings(event.settings)
          } else {
            void loadData()
          }
        }

        if ((event.type === 'booking.created' || event.type === 'booking.updated') && event.booking) {
          if (event.booking.bookingDate !== selectedBookingDate) {
            void loadData()
          }
        }

        if (event.notification) {
          if (event.type === 'notification.read') {
            setNotifications((current) =>
              current.map((notification) => (notification.id === event.notification?.id ? event.notification : notification)),
            )
          } else {
            handleRealtimeNotification(event.notification)
          }
        }

        if ((event.type === 'booking.created' || event.type === 'booking.updated') && !event.booking) {
          void loadData()
        }
      },
      [bookingQuery, bookingStatusFilter, handleRealtimeNotification, loadData, selectedBookingDate],
    ),
    onLegacyNotification: handleRealtimeNotification,
    onRefresh: loadData,
    onStatus: setRealtimeStatus,
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

  const handleStatusChange = async (booking: Booking, status: BookingStatus) => {
    const updatedBooking = { ...booking, status }
    const filters = { date: selectedBookingDate, query: bookingQuery, status: bookingStatusFilter }
    setBookings((current) =>
      sortBookingsByNewestCreated(
        bookingMatchesFilters(updatedBooking, filters)
          ? current.map((item) => (item.id === booking.id ? updatedBooking : item))
          : current.filter((item) => item.id !== booking.id),
      ),
    )
    try {
      await adminApi.updateBookingStatus(booking.id, status)
      setNotice('อัปเดตสถานะคิวแล้ว')
    } catch {
      setNotice('อัปเดตสถานะไม่สำเร็จ')
      void loadData()
    }
  }

  const handleDeleteBooking = async (booking: Booking) => {
    setBookings((current) => current.filter((item) => item.id !== booking.id))
    try {
      await adminApi.deleteBooking(booking.id)
      setNotice('ยกเลิกและลบคิวแล้ว')
    } catch {
      setNotice('ยกเลิกคิวไม่สำเร็จ')
      void loadData()
    }
  }

  const handleUpdateBooking = async (booking: Booking, payload: BookingPayload) => {
    try {
      const updated = await adminApi.updateBooking(booking.id, payload)
      const filters = { date: selectedBookingDate, query: bookingQuery, status: bookingStatusFilter }
      setBookings((current) =>
        sortBookingsByNewestCreated(
          bookingMatchesFilters(updated, filters)
            ? current.map((item) => (item.id === updated.id ? updated : item))
            : current.filter((item) => item.id !== updated.id),
        ),
      )
      setNotice('แก้ไขรายการจองแล้ว')
    } catch {
      setNotice('แก้ไขรายการจองไม่สำเร็จ')
      void loadData()
      throw new Error('update booking failed')
    }
  }

  const handleChangePage = (page: AdminPage) => {
    setActivePage(page)
    setIsNavOpen(false)
    window.requestAnimationFrame(resetPageScroll)
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AdminTopbar
        activePage={activePage}
        hasPendingAppUpdate={hasPendingAppUpdate}
        onOpenNav={() => setIsNavOpen(true)}
      />
      <MobileNavDrawer
          activePage={activePage}
          adminEmail={adminEmail}
          adminName={adminName}
          hasPendingAppUpdate={hasPendingAppUpdate}
          latestRealtimeAt={latestRealtimeAt}
          open={isNavOpen}
          realtimeStatus={realtimeStatus}
          unreadCount={summary.unread}
          onApplyAppUpdate={applyAppUpdate}
          onChangePage={handleChangePage}
          onClose={() => setIsNavOpen(false)}
          onLogout={onLogout}
      />

      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: '100dvh', pt: { xs: MOBILE_TOPBAR_OFFSET, lg: 0 } }}>
        <Sidebar
          activePage={activePage}
          adminEmail={adminEmail}
          adminName={adminName}
          hasPendingAppUpdate={hasPendingAppUpdate}
          latestRealtimeAt={latestRealtimeAt}
          realtimeStatus={realtimeStatus}
          unreadCount={summary.unread}
          onApplyAppUpdate={applyAppUpdate}
          onChangePage={handleChangePage}
          onLogout={onLogout}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2.5, sm: 2.5, lg: 2.5 },
            pt: { xs: 2.5, sm: 2.5, lg: '92px' },
            pb: { xs: 2.5, sm: 2.5, lg: 2.5 },
          }}
        >
          <Stack spacing={2.5}>
            <PushNotificationPrompt onNotice={setNotice} />

            {isLoading && !shouldShowDataSkeleton ? null : shouldShowDataSkeleton ? (
              <DashboardSkeleton activePage={activePage} />
            ) : (
              <>
                {activePage === 'overview' && (
                  <OverviewPage summary={summary} />
                )}
                {activePage === 'bookings' && (
	                  <BookingsPage
	                    bookings={bookings}
	                    query={bookingQuery}
	                    selectedDate={selectedBookingDate}
	                    services={services}
	                    statusFilter={bookingStatusFilter}
	                    onDeleteBooking={handleDeleteBooking}
	                    onQueryChange={setBookingQuery}
	                    onNextDay={() => setSelectedBookingDate((date) => addDaysToISODate(date, 1))}
	                    onPreviousDay={() => setSelectedBookingDate((date) => addDaysToISODate(date, -1))}
	                    onStatusFilterChange={setBookingStatusFilter}
	                    onStatusChange={handleStatusChange}
	                    onUpdateBooking={handleUpdateBooking}
	                  />
                )}
                {activePage === 'services' && (
                  <ServicesPage
                    services={services}
                    onAddService={async (payload) => {
                      const service = await adminApi.createService(payload)
                      setServices((current) => [service, ...current])
                      setNotice('เพิ่มบริการของร้านแล้ว')
                    }}
                    onDeleteService={async (serviceId) => {
                      await adminApi.deleteService(serviceId)
                      setServices((current) => current.filter((service) => service.id !== serviceId))
                      setNotice('ลบบริการของร้านแล้ว')
                    }}
                    onUpdateService={async (serviceId, payload) => {
                      const nextService = await adminApi.updateService(serviceId, payload)
                      setServices((current) => current.map((service) => (service.id === nextService.id ? nextService : service)))
                      setNotice('แก้ไขบริการของร้านแล้ว')
                    }}
                    onError={() => setNotice('บันทึกข้อมูลบริการไม่สำเร็จ')}
                  />
                )}
                {activePage === 'notifications' && (
                  <NotificationsPage
                    notifications={notifications}
                    onError={() => setNotice('อัปเดตแจ้งเตือนไม่สำเร็จ')}
                    onMarkAllRead={async () => {
                      const unreadNotifications = notifications.filter((notification) => !notification.isRead)
                      const updatedItems = await Promise.all(
                        unreadNotifications.map((notification) => adminApi.markNotificationRead(notification.id)),
                      )
                      setNotifications((current) =>
                        current.map((notification) => updatedItems.find((item) => item.id === notification.id) ?? notification),
                      )
                      setNotice('อ่านแจ้งเตือนทั้งหมดแล้ว')
                    }}
                    onMarkRead={async (notificationId) => {
                      const item = await adminApi.markNotificationRead(notificationId)
                      setNotifications((current) =>
                        current.map((notification) => (notification.id === item.id ? item : notification)),
                      )
                      setNotice('อ่านแจ้งเตือนแล้ว')
                    }}
                  />
                )}
                {activePage === 'settings' && (
                  <BookingSettingsPage
                    key={bookingSettings ? JSON.stringify(bookingSettings) : 'empty-booking-settings'}
                    settings={bookingSettings}
                    onSave={async (payload) => {
                      const nextSettings = await adminApi.updateBookingSettings(payload)
                      setBookingSettings(nextSettings)
                      setNotice('บันทึกการตั้งค่าร้านแล้ว')
                    }}
                    onError={() => setNotice('บันทึกการตั้งค่าร้านไม่สำเร็จ')}
                  />
                )}
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      <AppNoticeSnackbar message={notice} onClose={() => setNotice('')} />
    </Box>
  )
}

function AdminTopbar({
  activePage,
  hasPendingAppUpdate,
  onOpenNav,
}: {
  activePage: AdminPage
  hasPendingAppUpdate: boolean
  onOpenNav: () => void
}) {
  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: { xs: 0, lg: SIDEBAR_WIDTH },
        right: 0,
        zIndex: 30,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pt: { xs: SAFE_AREA_TOP, lg: 0 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          minHeight: { xs: 72, lg: 72 },
          px: { xs: 2.5, sm: 2.5, lg: 2.5 },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <IconButton
          aria-label="เปิดเมนู"
          onClick={onOpenNav}
          sx={{
            width: 'auto',
            minWidth: 64,
            height: 46,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            display: { xs: 'inline-flex', lg: 'none' },
            px: 1.5,
            fontSize: '0.9rem',
            fontWeight: 900,
          }}
        >
          เมนู
          {hasPendingAppUpdate && (
            <Box
              component="span"
              className="app-update-pulse"
              sx={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: '#FF008C',
                border: '2px solid #FFFFFF',
              }}
            />
          )}
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ minWidth: 0, textAlign: 'right' }}>
          <Typography
            variant="caption"
            sx={{ color: 'primary.main', display: 'block', fontWeight: 850, lineHeight: 1.1 }}
          >
            Service Booking Admin
          </Typography>
          <Typography sx={{ fontSize: { xs: '1rem', sm: '1.16rem', lg: '1.55rem' }, fontWeight: 900, lineHeight: 1.1 }}>
            {pageLabels[activePage]}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

function AppNoticeSnackbar({ message, onClose }: { message: string; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!message) return undefined

    const showTimer = window.setTimeout(() => setIsVisible(true), 20)
    const hideTimer = window.setTimeout(() => setIsVisible(false), 3200)
    const closeTimer = window.setTimeout(onClose, 3520)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
      window.clearTimeout(closeTimer)
      setIsVisible(false)
    }
  }, [message, onClose])

  if (!message) return null

  return (
    <Box
      role="status"
      sx={{
        position: 'fixed',
        top: { xs: MOBILE_FLOATING_TOP, lg: 24 },
        left: { xs: '50%', lg: `calc(${SIDEBAR_WIDTH}px + ((100vw - ${SIDEBAR_WIDTH}px) / 2))` },
        zIndex: 1100,
        width: 'calc(100vw - 32px)',
        maxWidth: 420,
        transform: `translate(-50%, ${isVisible ? '0' : '-18px'})`,
        opacity: isVisible ? 1 : 0,
        transition: 'transform 260ms ease, opacity 260ms ease',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 2.5,
        px: 2,
        py: 1.35,
        boxShadow: 'none',
        textAlign: 'center',
        fontWeight: 850,
      }}
    >
      {message}
    </Box>
  )
}

function MobileNavDrawer({
  activePage,
  adminEmail,
  adminName,
  hasPendingAppUpdate,
  latestRealtimeAt,
  open,
  realtimeStatus,
  unreadCount,
  onApplyAppUpdate,
  onChangePage,
  onClose,
  onLogout,
}: {
  activePage: AdminPage
  adminEmail: string
  adminName: string
  hasPendingAppUpdate: boolean
  latestRealtimeAt: Date | null
  open: boolean
  realtimeStatus: RealtimeStatus
  unreadCount: number
  onApplyAppUpdate: () => void
  onChangePage: (page: AdminPage) => void
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      transitionDuration={{ enter: 420, exit: 340 }}
      sx={{
        display: { xs: 'block', lg: 'none' },
        '& .MuiBackdrop-root': {
          bgcolor: overlay.backgroundColor,
          backdropFilter: overlay.backdropFilter,
          WebkitBackdropFilter: overlay.backdropFilter,
          transition: overlay.transition,
        },
        '& .MuiDrawer-paper': {
          width: { xs: 'min(84vw, 320px)', sm: 340 },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRight: '1px solid',
          borderColor: 'divider',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      }}
    >
      <SidebarContent
        activePage={activePage}
        adminEmail={adminEmail}
        adminName={adminName}
        compact={false}
        hasPendingAppUpdate={hasPendingAppUpdate}
        headerAction={
          <Button
            aria-label="ปิดเมนู"
            variant="outlined"
            onClick={onClose}
            sx={{ minHeight: 40, px: 1.8 }}
          >
            ปิด
          </Button>
        }
        latestRealtimeAt={latestRealtimeAt}
        realtimeStatus={realtimeStatus}
        unreadCount={unreadCount}
        onApplyAppUpdate={onApplyAppUpdate}
        onChangePage={onChangePage}
        onLogout={onLogout}
      />
    </Drawer>
  )
}

function Sidebar({
  activePage,
  adminEmail,
  adminName,
  hasPendingAppUpdate,
  latestRealtimeAt,
  realtimeStatus,
  unreadCount,
  onApplyAppUpdate,
  onChangePage,
  onLogout,
}: {
  activePage: AdminPage
  adminEmail: string
  adminName: string
  hasPendingAppUpdate: boolean
  latestRealtimeAt: Date | null
  realtimeStatus: RealtimeStatus
  unreadCount: number
  onApplyAppUpdate: () => void
  onChangePage: (page: AdminPage) => void
  onLogout: () => void
}) {
  return (
    <Box
      component="aside"
      sx={{
        display: { xs: 'none', lg: 'block' },
        width: 280,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        maxHeight: '100vh',
      }}
    >
      <SidebarContent
        activePage={activePage}
        adminEmail={adminEmail}
        adminName={adminName}
        compact={false}
        hasPendingAppUpdate={hasPendingAppUpdate}
        latestRealtimeAt={latestRealtimeAt}
        realtimeStatus={realtimeStatus}
        unreadCount={unreadCount}
        onApplyAppUpdate={onApplyAppUpdate}
        onChangePage={onChangePage}
        onLogout={onLogout}
      />
    </Box>
  )
}

function SidebarContent({
  activePage,
  adminEmail,
  adminName,
  compact,
  hasPendingAppUpdate,
  headerAction,
  latestRealtimeAt,
  realtimeStatus,
  unreadCount,
  onApplyAppUpdate,
  onChangePage,
  onLogout,
}: {
  activePage: AdminPage
  adminEmail: string
  adminName: string
  compact: boolean
  hasPendingAppUpdate: boolean
  headerAction?: ReactNode
  latestRealtimeAt: Date | null
  realtimeStatus: RealtimeStatus
  unreadCount: number
  onApplyAppUpdate: () => void
  onChangePage: (page: AdminPage) => void
  onLogout: () => void
}) {
  const navItems: Array<{ page: AdminPage; label: string; icon: ReactNode }> = [
    { page: 'overview', label: 'ภาพรวมของร้าน', icon: <DashboardIcon /> },
    { page: 'bookings', label: 'รายการจอง', icon: <CalendarMonthIcon /> },
    { page: 'services', label: 'บริการของร้าน', icon: <MiscellaneousServicesIcon /> },
    { page: 'notifications', label: 'รายการแจ้งเตือน', icon: <NotificationsIcon /> },
    { page: 'settings', label: 'การตั้งค่าร้าน', icon: <SettingsIcon /> },
  ]

  return (
    <Stack
      sx={{
        minHeight: '100%',
        p: 2.5,
        overflowY: 'auto',
      }}
      spacing={2}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: compact ? 'center' : 'flex-start',
            '& p': { display: compact ? 'none' : 'block' },
          }}
        >
          <BrandMark />
        </Box>
        {headerAction}
      </Stack>
      <Stack spacing={1}>
        {navItems.map((item) => {
          const isActive = activePage === item.page
          return (
            <Tooltip key={item.page} title={compact ? item.label : ''} placement="right">
              <Button
                fullWidth
                variant={isActive ? 'contained' : 'outlined'}
                startIcon={item.icon}
                aria-label={item.label}
                onClick={() => onChangePage(item.page)}
                sx={{
                  position: 'relative',
                  justifyContent: compact ? 'center' : 'flex-start',
                  minHeight: compact ? 50 : 58,
                  minWidth: 0,
                  pl: compact ? 0 : 2.5,
                  pr: compact ? 0 : item.page === 'notifications' && unreadCount > 0 ? 5 : 2.5,
                  fontSize: '1rem',
                  fontWeight: 900,
                  bgcolor: isActive ? 'primary.main' : 'background.default',
                  '& .MuiButton-startIcon': {
                    mr: compact ? 0 : 1.25,
                    ml: 0,
                    '& svg': {
                      fontSize: 23,
                    },
                  },
                }}
              >
                {item.page === 'notifications' && unreadCount > 0 && (
                  <Box
                    component="span"
                    aria-label={`${unreadCount} รายการแจ้งเตือนที่ยังไม่อ่าน`}
                    sx={{
                      position: 'absolute',
                      top: 7,
                      right: 8,
                      minWidth: 22,
                      height: 22,
                      px: 0.6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      border: '1px solid',
                      borderColor: 'background.paper',
                      fontSize: '0.72rem',
                      fontWeight: 950,
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Box>
                )}
                <Box
                  component="span"
                  sx={{
                    display: compact ? 'none' : 'inline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </Box>
              </Button>
            </Tooltip>
          )
        })}
      </Stack>
      <Box sx={{ flex: 1 }} />
      <AdminProfilePanel
        adminEmail={adminEmail}
        adminName={adminName}
        hasPendingAppUpdate={hasPendingAppUpdate}
        latestRealtimeAt={latestRealtimeAt}
        onApplyAppUpdate={onApplyAppUpdate}
        onLogout={onLogout}
        realtimeStatus={realtimeStatus}
      />
    </Stack>
  )
}

function AdminProfilePanel({
  adminEmail,
  adminName,
  hasPendingAppUpdate,
  latestRealtimeAt,
  onApplyAppUpdate,
  onLogout,
  realtimeStatus,
}: {
  adminEmail: string
  adminName: string
  hasPendingAppUpdate: boolean
  latestRealtimeAt: Date | null
  onApplyAppUpdate: () => void
  onLogout: () => void
  realtimeStatus: RealtimeStatus
}) {
  const statusLabel: Record<RealtimeStatus, string> = {
    connected: 'เชื่อมต่อข้อมูลล่าสุด',
    connecting: 'กำลังเชื่อมต่อ',
    reconnecting: 'กำลังเชื่อมต่อใหม่',
    off: 'ปิดข้อมูลสด',
  }
  const statusColor = realtimeStatus === 'off' ? 'text.secondary' : 'primary.main'
  const latestLabel = latestRealtimeAt
    ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(latestRealtimeAt)
    : 'ยังไม่มีข้อมูลอัปเดต'

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
        color: 'text.primary',
        p: 2,
      }}
    >
      <Stack spacing={1.6}>
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 950, lineHeight: 1.2 }}>{adminName}</Typography>
          <Typography sx={{ mt: 0.45, color: 'text.secondary', fontSize: '0.84rem', fontWeight: 800, wordBreak: 'break-word' }}>
            {adminEmail}
          </Typography>
        </Box>

        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4, bgcolor: 'background.default' }}>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <WifiTetheringIcon sx={{ color: statusColor, fontSize: 30 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 950, color: 'text.primary', lineHeight: 1.25 }}>
                {statusLabel[realtimeStatus]}
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: 'text.secondary',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                ข้อมูลล่าสุด {latestLabel}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: hasPendingAppUpdate ? 'primary.main' : 'divider',
            borderRadius: 2.5,
            p: 1.4,
            bgcolor: hasPendingAppUpdate ? '#F3F4F6' : 'background.default',
          }}
        >
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <SystemUpdateAltIcon
                className={hasPendingAppUpdate ? 'app-update-pulse' : undefined}
                sx={{
                  color: hasPendingAppUpdate ? 'primary.main' : 'text.secondary',
                  fontSize: 30,
                }}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 950, color: 'text.primary', lineHeight: 1.25 }}>
                อัปเดตแอป
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: 'text.secondary',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hasPendingAppUpdate ? 'มีเวอร์ชันใหม่พร้อมใช้งาน' : 'กำลังใช้เวอร์ชันล่าสุด'}
              </Typography>
            </Box>
          </Stack>
          {hasPendingAppUpdate && (
            <Button fullWidth variant="contained" onClick={onApplyAppUpdate} sx={{ mt: 1.4 }}>
              อัพเดตเลย
            </Button>
          )}
        </Box>

        <Button
          fullWidth
          onClick={onLogout}
          startIcon={<LogoutIcon />}
          variant="outlined"
          sx={{
            borderColor: '#DC2626',
            color: '#FFFFFF',
            bgcolor: '#DC2626',
            '&:hover': {
              borderColor: '#B91C1C',
              bgcolor: '#B91C1C',
            },
          }}
        >
          ออกจากระบบ
        </Button>
      </Stack>
    </Box>
  )
}
function OverviewPage({
  summary,
}: {
  summary: { pending: number; confirmed: number; unread: number; total: number }
}) {
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <SummaryCard icon={<HourglassTopIcon />} label="รอจัดการ" value={summary.pending} color="#FF008C" />
        <SummaryCard icon={<CheckCircleIcon />} label="ยืนยันแล้ว" value={summary.confirmed} color="#111827" />
        <SummaryCard icon={<CalendarMonthIcon />} label="คิวทั้งหมด" value={summary.total} color="#FF008C" />
        <SummaryCard icon={<NotificationsIcon />} label="แจ้งเตือนยังไม่อ่าน" value={summary.unread} color="#111827" />
      </Grid>
    </Stack>
  )
}

function BookingsPage({
  bookings,
  query,
  selectedDate,
  services,
  statusFilter,
  onDeleteBooking,
  onNextDay,
  onPreviousDay,
  onQueryChange,
  onStatusFilterChange,
  onStatusChange,
  onUpdateBooking,
}: {
  bookings: Booking[]
  query: string
  selectedDate: string
  services: ServiceItem[]
  statusFilter: BookingStatus | 'all'
  onDeleteBooking: (booking: Booking) => void
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
      query={query}
      selectedDate={selectedDate}
      services={services}
      statusFilter={statusFilter}
      onDeleteBooking={onDeleteBooking}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
      onQueryChange={onQueryChange}
      onStatusFilterChange={onStatusFilterChange}
      onStatusChange={onStatusChange}
      onUpdateBooking={onUpdateBooking}
    />
  )
}

function NotificationsPage({
  notifications,
  onError,
  onMarkAllRead,
  onMarkRead,
}: {
  notifications: AdminNotification[]
  onError: () => void
  onMarkAllRead: () => Promise<void>
  onMarkRead: (notificationId: string) => Promise<void>
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingId, setMarkingId] = useState('')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const unreadCount = notifications.filter((notification) => !notification.isRead).length
  const visibleNotifications = filter === 'unread' ? notifications.filter((notification) => !notification.isRead) : notifications

  const handleMarkRead = async (notificationId: string) => {
    if (markingId) return
    setMarkingId(notificationId)
    try {
      await onMarkRead(notificationId)
    } catch {
      onError()
    } finally {
      setMarkingId('')
    }
  }

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return
    setIsMarkingAll(true)
    try {
      await onMarkAllRead()
    } catch {
      onError()
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
            <Typography variant="h2">รายการแจ้งเตือน</Typography>
            <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={0.8}>
                <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')}>
                  ทั้งหมด
                </Button>
                <Button variant={filter === 'unread' ? 'contained' : 'outlined'} onClick={() => setFilter('unread')}>
                  ยังไม่อ่าน
                </Button>
              </Stack>
              <Button variant="outlined" disabled={isMarkingAll || unreadCount === 0} onClick={handleMarkAllRead}>
                {isMarkingAll ? 'กำลังอ่าน...' : 'อ่านทั้งหมด'}
              </Button>
            </Stack>
          </Stack>

          {visibleNotifications.length === 0 ? (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', py: 5, px: 2, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 900 }}>{filter === 'unread' ? 'ไม่มีแจ้งเตือนที่ยังไม่อ่าน' : 'ยังไม่มีรายการแจ้งเตือน'}</Typography>
            </Box>
          ) : (
            <Stack spacing={1.2}>
              {visibleNotifications.map((notification) => (
                <Box
                  key={notification.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                    bgcolor: notification.isRead ? 'background.default' : 'secondary.main',
                    p: 1.6,
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 950 }}>{notification.title}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>{notification.body}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        {formatNotificationTimestamp(notification.createdAt)}
                      </Typography>
                    </Box>
                    {!notification.isRead && (
                      <Button
                        variant="contained"
                        disabled={markingId === notification.id}
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        อ่านแล้ว
                      </Button>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function BookingSettingsPage({
  onError,
  onSave,
  settings,
}: {
  onError: () => void
  onSave: (payload: BookingSettings) => Promise<void>
  settings: BookingSettings | null
}) {
  const [openTime, setOpenTime] = useState(settings?.openTime ?? '09:00')
  const [closeTime, setCloseTime] = useState(settings?.closeTime ?? '17:00')
  const [slotCapacity, setSlotCapacity] = useState(String(settings?.slotCapacity ?? 1))
  const [minAdvanceHours, setMinAdvanceHours] = useState(String(settings?.minAdvanceHours ?? 0))
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(String(settings?.maxAdvanceDays ?? 60))
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(String(settings?.reminderLeadMinutes ?? 1440))
  const [bufferMinutes, setBufferMinutes] = useState(String(settings?.bufferMinutes ?? 0))
  const [closedWeekdays, setClosedWeekdays] = useState(settings?.closedWeekdays ?? '')
  const [blackoutDates, setBlackoutDates] = useState(settings?.blackoutDates ?? [])
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await onSave({
        openTime,
        closeTime,
        slotIntervalMinutes: settings?.slotIntervalMinutes ?? 30,
        slotCapacity: Number(slotCapacity),
        closedWeekdays,
        minAdvanceHours: Number(minAdvanceHours),
        maxAdvanceDays: Number(maxAdvanceDays),
        reminderLeadMinutes: Number(reminderLeadMinutes),
        bufferMinutes: Number(bufferMinutes),
        blackoutDates: blackoutDates
          .map((item) => ({ date: item.date.trim(), reason: item.reason?.trim() ?? '' }))
          .filter((item) => item.date),
      })
    } catch {
      onError()
    } finally {
      setIsSaving(false)
    }
  }

  const weekdayOptions = [
    ['0', 'วันอาทิตย์'],
    ['1', 'วันจันทร์'],
    ['2', 'วันอังคาร'],
    ['3', 'วันพุธ'],
    ['4', 'วันพฤหัสบดี'],
    ['5', 'วันศุกร์'],
    ['6', 'วันเสาร์'],
  ] as const
  const selectedDays = closedWeekdays.split(',').map((value) => value.trim()).filter(Boolean)
  const weekdayLabelMap = new Map<string, string>(weekdayOptions)

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          การตั้งค่าร้าน
        </Typography>
        <Stack spacing={2}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>เวลาเปิดร้าน</Typography>
                <Select
                  aria-label="เวลาเปิดร้าน"
                  value={openTime}
                  onChange={(event) => setOpenTime(event.target.value)}
                >
                  {shopTimeOptions.map((option) => (
                    <MenuItem key={`open-${option.value}`} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>เวลาปิดร้าน</Typography>
                <Select
                  aria-label="เวลาปิดร้าน"
                  value={closeTime}
                  onChange={(event) => setCloseTime(event.target.value)}
                >
                  {shopTimeOptions.map((option) => (
                    <MenuItem key={`close-${option.value}`} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="ช่างกี่คน"
                value={slotCapacity}
                onChange={(event) => setSlotCapacity(digitsOnly(event.target.value))}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="จองล่วงหน้าอย่างน้อย (ชั่วโมง)"
                value={minAdvanceHours}
                onChange={(event) => setMinAdvanceHours(digitsOnly(event.target.value))}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="จองล่วงหน้าได้สูงสุด (วัน)"
                value={maxAdvanceDays}
                onChange={(event) => setMaxAdvanceDays(digitsOnly(event.target.value))}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>เตือนก่อนนัด</Typography>
                <Select
                  aria-label="เตือนก่อนนัด"
                  value={reminderLeadMinutes}
                  onChange={(event) => setReminderLeadMinutes(event.target.value)}
                >
                  {reminderLeadOptions.map((option) => (
                    <MenuItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>เวลาพักระหว่างคิว</Typography>
                <Select
                  aria-label="เวลาพักระหว่างคิว"
                  value={bufferMinutes}
                  onChange={(event) => setBufferMinutes(event.target.value)}
                >
                  {bufferMinuteOptions.map((option) => (
                    <MenuItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box>
            <Typography sx={{ mb: 1, fontSize: '0.9rem', fontWeight: 900 }}>วันปิดร้าน</Typography>
            <Select
              fullWidth
              multiple
              displayEmpty
              value={selectedDays}
              onChange={(event) => {
                const value = event.target.value
                const days = Array.isArray(value) ? value : value.split(',')
                setClosedWeekdays(days.map((day) => String(day)).sort().join(','))
              }}
              renderValue={(selected) => {
                const days = selected as string[]
                if (days.length === 0) return 'เลือกวันที่ร้านหยุด'
                return days.map((day) => weekdayLabelMap.get(day) ?? day).join(', ')
              }}
            >
              {weekdayOptions.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 900 }}>วันหยุดเฉพาะวันที่</Typography>
              <Button
                variant="outlined"
                onClick={() => setBlackoutDates((current) => [...current, { date: '', reason: '' }])}
              >
                เพิ่มวันหยุด
              </Button>
            </Stack>
            <Stack spacing={1}>
              {blackoutDates.length === 0 && (
                <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>ยังไม่มีวันหยุดเฉพาะวันที่</Typography>
              )}
              {blackoutDates.map((item, index) => (
                <Grid container spacing={1} key={`${item.id ?? 'new'}-${index}`}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="date"
                      value={item.date}
                      onChange={(event) =>
                        setBlackoutDates((current) =>
                          current.map((dateItem, itemIndex) => (itemIndex === index ? { ...dateItem, date: event.target.value } : dateItem)),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      placeholder="เหตุผล เช่น ร้านหยุดพิเศษ"
                      value={item.reason ?? ''}
                      onChange={(event) =>
                        setBlackoutDates((current) =>
                          current.map((dateItem, itemIndex) => (itemIndex === index ? { ...dateItem, reason: event.target.value } : dateItem)),
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setBlackoutDates((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      sx={{ minHeight: 56, bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
                    >
                      ลบ
                    </Button>
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function ServicesPage({
  services,
  onAddService,
  onDeleteService,
  onError,
  onUpdateService,
}: {
  services: ServiceItem[]
  onAddService: (payload: ServicePayload) => Promise<void>
  onDeleteService: (serviceId: string) => Promise<void>
  onError: () => void
  onUpdateService: (serviceId: string, payload: ServicePayload) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null)
  const [nameTh, setNameTh] = useState('')
  const [priceBaht, setPriceBaht] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [descriptionTh, setDescriptionTh] = useState('')
  const [isSavingService, setIsSavingService] = useState(false)
  const [isDeletingService, setIsDeletingService] = useState(false)
  const [togglingServiceId, setTogglingServiceId] = useState('')

  const canAdd = Boolean(nameTh.trim() && Number(priceBaht) >= 0 && Number(durationMinutes) > 0)

  const filteredServices = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return services

    return services.filter((service) =>
      [service.nameTh, service.nameEn, service.descriptionTh, service.durationMinutes.toString(), formatThaiPrice(service.priceCents)]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [query, services])

  const resetForm = () => {
    setNameTh('')
    setPriceBaht('')
    setDurationMinutes('')
    setDescriptionTh('')
  }

  const openEditor = (service?: ServiceItem) => {
    if (service) {
      setEditingService(service)
      setNameTh(service.nameTh)
      setPriceBaht(String(service.priceCents / 100))
      setDurationMinutes(String(service.durationMinutes))
      setDescriptionTh(service.descriptionTh ?? '')
    } else {
      setEditingService(null)
      resetForm()
    }
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    window.setTimeout(() => {
      setEditingService(null)
      resetForm()
    }, 520)
  }

  const handleSaveService = async () => {
    if (!canAdd || isSavingService) return

    const payload: ServicePayload = {
      nameTh: nameTh.trim(),
      nameEn: editingService?.nameEn ?? nameTh.trim(),
      descriptionTh: descriptionTh.trim(),
      durationMinutes: Number(durationMinutes),
      priceCents: Math.round(Number(priceBaht) * 100),
      accentColor: editingService?.accentColor ?? '#FF008C',
      isActive: editingService?.isActive ?? true,
    }

    setIsSavingService(true)
    try {
      if (editingService) {
        await onUpdateService(editingService.id, payload)
      } else {
        await onAddService(payload)
      }
      closeEditor()
    } catch {
      onError()
    } finally {
      setIsSavingService(false)
    }
  }

  const handleDeleteService = async () => {
    if (!serviceToDelete || isDeletingService) return
    setIsDeletingService(true)
    try {
      await onDeleteService(serviceToDelete.id)
      setServiceToDelete(null)
    } catch {
      onError()
    } finally {
      setIsDeletingService(false)
    }
  }

  const handleToggleServiceActive = async (service: ServiceItem) => {
    if (togglingServiceId) return
    setTogglingServiceId(service.id)
    try {
      await onUpdateService(service.id, {
        nameTh: service.nameTh,
        nameEn: service.nameEn,
        descriptionTh: service.descriptionTh ?? '',
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        accentColor: service.accentColor,
        isActive: !service.isActive,
      })
    } catch {
      onError()
    } finally {
      setTogglingServiceId('')
    }
  }

  const previewName = nameTh.trim() || 'ตัวอย่างบริการ'
  const previewDescription = descriptionTh.trim() || 'รายละเอียดบริการจะแสดงให้ลูกค้าเห็นตรงนี้'
  const previewDuration = Number(durationMinutes) > 0 ? `${Number(durationMinutes)} นาที` : 'เวลาที่ใช้'
  const previewPrice = Number(priceBaht) >= 0 ? formatThaiPrice(Math.round(Number(priceBaht) * 100)) : 'ราคา'

  return (
    <>
      <ManagementToolbar
        addLabel="เพิ่มบริการ"
        onAdd={() => openEditor()}
        onSearch={setQuery}
        placeholder="ค้นหาบริการ"
        query={query}
      />

      <Box component="section" sx={{ pt: { xs: 8, lg: 10 } }}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
              <Typography variant="h2" sx={{ minWidth: 0, flex: 1 }}>
                รายการบริการของร้าน
              </Typography>
              <Chip color="secondary" label={`${filteredServices.length} รายการ`} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }} />
            </Stack>

            <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
              {filteredServices.map((service) => (
                <Box
                  key={service.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                    p: 1.5,
                    bgcolor: 'background.default',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>{service.nameTh}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {service.descriptionTh || service.nameEn}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ราคา
                        </Typography>
                        <Typography sx={{ fontWeight: 850 }}>{formatThaiPrice(service.priceCents)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          เวลา
                        </Typography>
                        <Typography sx={{ fontWeight: 850 }}>{service.durationMinutes} นาที</Typography>
                      </Box>
                      <ServiceActiveControl
                        checked={service.isActive}
                        disabled={togglingServiceId === service.id}
                        onChange={() => handleToggleServiceActive(service)}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Button variant="outlined" onClick={() => openEditor(service)}>
                        แก้ไข
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setServiceToDelete(service)}
                        sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
                      >
                        ลบ
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
              {filteredServices.length === 0 && (
                <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary', fontWeight: 800 }}>
                  {services.length === 0 ? 'ยังไม่มีรายการบริการ' : 'ไม่พบบริการที่ค้นหา'}
                </Typography>
              )}
            </Stack>

            <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table aria-label="service table">
                <TableHead>
                  <TableRow>
                    <TableCell>บริการ</TableCell>
                    <TableCell>ราคา</TableCell>
                    <TableCell>เวลา</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell align="right">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 850 }}>{service.nameTh}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {service.descriptionTh || service.nameEn}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{formatThaiPrice(service.priceCents)}</TableCell>
                      <TableCell>{service.durationMinutes} นาที</TableCell>
                      <TableCell>
                        <ServiceActiveControl
                          checked={service.isActive}
                          disabled={togglingServiceId === service.id}
                          onChange={() => handleToggleServiceActive(service)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button variant="outlined" onClick={() => openEditor(service)}>
                            แก้ไข
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => setServiceToDelete(service)}
                            sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
                          >
                            ลบ
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center', color: 'text.secondary', fontWeight: 800 }}>
                        {services.length === 0 ? 'ยังไม่มีรายการบริการ' : 'ไม่พบบริการที่ค้นหา'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <BottomEditorSheet isOpen={isEditorOpen} onClose={closeEditor} title={editingService ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}>
        <Box component="form" onSubmit={(event) => { event.preventDefault(); handleSaveService() }}>
          <Stack spacing={2}>
            <TextField fullWidth label="ชื่อบริการ" value={nameTh} onChange={(event) => setNameTh(event.target.value)} />
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="ราคา"
                  value={priceBaht}
                  onChange={(event) => setPriceBaht(digitsOnly(event.target.value))}
                  slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="เวลาที่ใช้ (นาที)"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(digitsOnly(event.target.value))}
                  slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="รายละเอียดบริการ"
              value={descriptionTh}
              onChange={(event) => setDescriptionTh(event.target.value)}
            />
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.5, bgcolor: 'background.default' }}>
              <Typography sx={{ mb: 1, fontSize: '0.86rem', fontWeight: 900, color: 'text.primary' }}>
                ตัวอย่างที่แสดงในหน้าลูกค้า
              </Typography>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1.3}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '1.18rem', fontWeight: 950, lineHeight: 1.2 }}>
                      {previewName}
                      </Typography>
                      <Typography sx={{ mt: 0.45, color: 'text.secondary', lineHeight: 1.5 }}>
                        {previewDescription}
                      </Typography>
                    </Box>
                    <Divider />
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip color="secondary" label={previewDuration} />
                      <Typography sx={{ color: 'primary.main', fontWeight: 950 }}>{previewPrice}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
            <Stack direction="row" spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="outlined" disabled={isSavingService} onClick={closeEditor}>
                ยกเลิก
              </Button>
              <Button variant="contained" type="submit" disabled={!canAdd || isSavingService}>
                {isSavingService ? 'กำลังบันทึก...' : editingService ? 'บันทึกการแก้ไข' : 'บันทึกบริการ'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </BottomEditorSheet>

      <Dialog
        open={Boolean(serviceToDelete)}
        onClose={() => setServiceToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 950 }}>ยืนยันการลบบริการ</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
            ต้องการลบ {serviceToDelete?.nameTh ?? 'บริการนี้'} ใช่หรือไม่
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" disabled={isDeletingService} onClick={() => setServiceToDelete(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={isDeletingService}
            onClick={handleDeleteService}
            sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
          >
            {isDeletingService ? 'กำลังลบ...' : 'ยืนยันลบ'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function ServiceActiveControl({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <Stack
      spacing={0.45}
      sx={{
        alignItems: 'flex-start',
        flex: '0 0 72px',
        width: 72,
        minWidth: 72,
        minHeight: 43,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          width: 72,
          color: 'text.secondary',
          fontWeight: 850,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}
      >
        {checked ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
      </Typography>
      <IOSSwitch
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </Stack>
  )
}

function ManagementToolbar({
  addLabel,
  onAdd,
  onSearch,
  placeholder,
  query,
}: {
  addLabel: string
  onAdd: () => void
  onSearch: (value: string) => void
  placeholder: string
  query: string
}) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: { xs: MOBILE_FLOATING_TOP, lg: 88 },
        left: { xs: 20, sm: 20, lg: SIDEBAR_WIDTH + 20 },
        right: { xs: 20, sm: 20, lg: 20 },
        zIndex: 25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
        p: 1.2,
        boxShadow: 'none',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <TextField
          placeholder={placeholder}
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button variant="contained" onClick={onAdd} sx={{ minHeight: 44, px: { xs: 1.4, sm: 2 } }}>
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{addLabel}</Box>
        </Button>
      </Stack>
    </Box>
  )
}

function BottomEditorSheet({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  return (
    <Portal>
      <Box
        aria-hidden={!isOpen}
        data-testid="bottom-editor-overlay"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: { xs: 0, lg: SIDEBAR_WIDTH },
          zIndex: 1200,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <Box
          aria-hidden="true"
          data-testid="bottom-editor-backdrop"
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            border: 0,
            bgcolor: overlay.backgroundColor,
            backdropFilter: overlay.backdropFilter,
            WebkitBackdropFilter: overlay.backdropFilter,
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${isOpen ? 360 : 280}ms ease`,
          }}
        />
        <Box
          role="dialog"
          aria-modal="true"
          aria-label={title}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: { xs: 'calc(100% - 40px)', sm: 720 },
            maxWidth: 'calc(100% - 40px)',
            maxHeight: 'calc(100dvh - 40px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            boxShadow: 'none',
            transform: isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, calc(-50% + 46px)) scale(0.98)',
            opacity: isOpen ? 1 : 0,
            transition: `transform ${isOpen ? 520 : 420}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${isOpen ? 320 : 260}ms ease`,
            willChange: 'transform',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', p: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: '1.1rem', fontWeight: 950 }}>{title}</Typography>
            <Button variant="outlined" onClick={onClose}>
              ปิด
            </Button>
          </Stack>
          <Box sx={{ minHeight: 0, overflowY: 'auto', p: 2.5 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Portal>
  )
}

function BookingsCard({
  bookings,
  query,
  selectedDate,
  services,
  statusFilter,
  onDeleteBooking,
  onNextDay,
  onPreviousDay,
  onQueryChange,
  onStatusFilterChange,
  onStatusChange,
  onUpdateBooking,
}: {
  bookings: Booking[]
  query: string
  selectedDate: string
  services: ServiceItem[]
  statusFilter: BookingStatus | 'all'
  onDeleteBooking: (booking: Booking) => void
  onNextDay: () => void
  onPreviousDay: () => void
  onQueryChange: (query: string) => void
  onStatusFilterChange: (status: BookingStatus | 'all') => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void
  onUpdateBooking: (booking: Booking, payload: BookingPayload) => Promise<void>
}) {
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [editServiceId, setEditServiceId] = useState('')
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSlotTime, setEditSlotTime] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const openEditBooking = (booking: Booking) => {
    if (isClosedBookingStatus(booking.status)) return
    setEditingBooking(booking)
    setEditServiceId(booking.serviceId)
    setEditCustomerName(booking.customerName)
    setEditPhone(booking.phone)
    setEditDate(booking.bookingDate)
    setEditSlotTime(booking.slotTime)
    setEditNotes(booking.notes ?? '')
  }

  const handleSaveBooking = async () => {
    if (!editingBooking || isSaving) return
    setIsSaving(true)
    try {
      await onUpdateBooking(editingBooking, {
        serviceId: editServiceId,
        customerName: editingBooking.customerName,
        phone: editingBooking.phone,
        bookingDate: editDate,
        slotTime: editSlotTime,
        notes: editNotes.trim(),
        status: editingBooking.status,
      })
      setEditingBooking(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
            <Typography variant="h2">รายการจอง</Typography>
            <Typography sx={{ fontWeight: 950, color: 'primary.main' }}>{formatThaiDateLabel(selectedDate)}</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            <TextField
              placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขที่จอง"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
              <Select
                aria-label="กรองสถานะ"
                value={statusFilter}
                onChange={(event) => onStatusFilterChange(event.target.value as BookingStatus | 'all')}
              >
                <MenuItem value="all">ทุกสถานะ</MenuItem>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <MenuItem key={status} value={status}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onPreviousDay}>
              วันก่อนหน้า
            </Button>
            <Button variant="outlined" onClick={onNextDay}>
              วันถัดไป
            </Button>
          </Stack>
        </Stack>

        {bookings.length === 0 ? (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              bgcolor: 'background.default',
              py: 5,
              px: 2,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>ยังไม่มีรายการจอง</Typography>
          </Box>
        ) : (
          <>
            <Stack data-testid="booking-mobile-list" spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
              {bookings.map((booking) => (
                <Box
                  key={booking.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                    bgcolor: 'background.default',
                    p: 1.5,
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 950, lineHeight: 1.25 }}>{booking.bookingCode}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.86rem', fontWeight: 760 }}>
                          {booking.customerName}
                        </Typography>
                      </Box>
                      <Chip
                        color={isClosedBookingStatus(booking.status) ? 'secondary' : 'primary'}
                        label={statusLabels[booking.status]}
                        sx={{ ...statusChipTextSx(booking.status), flexShrink: 0 }}
                      />
                    </Stack>
                    <Box>
                      <Typography sx={{ fontSize: '0.86rem', fontWeight: 850 }}>{booking.service?.nameTh ?? '-'}</Typography>
                      <Stack spacing={0.35} sx={{ mt: 0.6 }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>
                          วันที่: {formatThaiDateLabel(booking.bookingDate)}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>
                          เวลา: {booking.slotTime}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>
                          เบอร์โทร: {booking.phone}
                        </Typography>
                      </Stack>
                    </Box>
	                    <BookingActionButtons booking={booking} onDeleteBooking={onDeleteBooking} onEditBooking={openEditBooking} onStatusChange={onStatusChange} />
                  </Stack>
                </Box>
              ))}
            </Stack>

            <TableContainer data-testid="booking-table" sx={{ display: { xs: 'none', md: 'block' } }}>
          <Table aria-label="booking table">
            <TableHead>
              <TableRow>
                <TableCell>เลขที่</TableCell>
                <TableCell>ลูกค้า</TableCell>
                <TableCell>บริการ</TableCell>
                <TableCell>วันเวลา</TableCell>
                <TableCell>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell sx={{ fontWeight: 800 }}>{booking.bookingCode}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 760 }}>{booking.customerName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {booking.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>{booking.service?.nameTh ?? '-'}</TableCell>
                  <TableCell>
                    {formatThaiDateLabel(booking.bookingDate)} {booking.slotTime}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Chip color={isClosedBookingStatus(booking.status) ? 'secondary' : 'primary'} label={statusLabels[booking.status]} sx={statusChipTextSx(booking.status)} />
	                      <BookingActionButtons booking={booking} onDeleteBooking={onDeleteBooking} onEditBooking={openEditBooking} onStatusChange={onStatusChange} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
          </>
        )}
        </CardContent>
      </Card>
      <BottomEditorSheet isOpen={Boolean(editingBooking)} onClose={() => setEditingBooking(null)} title="แก้ไขรายการจอง">
        <Stack spacing={2}>
          <FormControl fullWidth>
            <Select aria-label="บริการ" value={editServiceId} onChange={(event) => setEditServiceId(event.target.value)}>
              {services.map((service) => (
                <MenuItem key={service.id} value={service.id}>
                  {service.nameTh}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            disabled
            label="ชื่อผู้จอง"
            value={editCustomerName}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            fullWidth
            disabled
            label="เบอร์โทร"
            value={editPhone}
            slotProps={{ input: { readOnly: true }, htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
          />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="วันที่" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <Select aria-label="เวลา" value={editSlotTime} onChange={(event) => setEditSlotTime(event.target.value)} displayEmpty>
                  <MenuItem value="" disabled>
                    เลือกเวลา
                  </MenuItem>
                  {shopTimeOptions.map((option) => (
                    <MenuItem key={`edit-time-${option.value}`} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField fullWidth multiline minRows={3} label="หมายเหตุ" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={!editServiceId || !editDate || !editSlotTime || isSaving}
              onClick={handleSaveBooking}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </Stack>
        </Stack>
      </BottomEditorSheet>
    </>
  )
}

function BookingActionButtons({
  booking,
  onDeleteBooking,
  onEditBooking,
  onStatusChange,
}: {
  booking: Booking
  onDeleteBooking: (booking: Booking) => void
  onEditBooking: (booking: Booking) => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void | Promise<void>
}) {
  const statusAction = getBookingStatusAction(booking.status)

  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
      <Button
        fullWidth
        variant="outlined"
        disabled={isClosedBookingStatus(booking.status)}
        onClick={() => onEditBooking(booking)}
      >
        แก้ไข
      </Button>
      <Button
        fullWidth
        variant="contained"
        disabled={isClosedBookingStatus(booking.status)}
        onClick={() => onDeleteBooking(booking)}
        sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
      >
        ยกเลิก
      </Button>
      <Button
        fullWidth
        variant="outlined"
        disabled={isClosedBookingStatus(booking.status)}
        onClick={() => onStatusChange(booking, 'no_show')}
      >
        ไม่มาตามนัด
      </Button>
      <Button
        fullWidth
        variant="contained"
        disabled={statusAction.disabled}
        onClick={() => onStatusChange(booking, statusAction.nextStatus)}
      >
        {statusAction.label}
      </Button>
    </Stack>
  )
}

function DashboardSkeleton({ activePage }: { activePage: AdminPage }) {
  if (activePage === 'services') {
    return <ServicesSkeleton />
  }

  if (activePage === 'bookings') {
    return <TableSkeleton />
  }

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={`summary-skeleton-${index}`}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 2.5, bgcolor: 'divider' }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={22} sx={{ bgcolor: 'divider' }} />
                    <Skeleton variant="text" width={46} height={36} sx={{ bgcolor: 'divider' }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

function ServicesSkeleton() {
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          position: 'fixed',
          top: { xs: MOBILE_FLOATING_TOP, lg: 88 },
          left: { xs: 20, sm: 20, lg: SIDEBAR_WIDTH + 20 },
          right: { xs: 20, sm: 20, lg: 20 },
          zIndex: 25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          p: 1.2,
          boxShadow: 'none',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rectangular" height={44} sx={{ flex: 1, borderRadius: 2, bgcolor: 'divider' }} />
          <Skeleton variant="rectangular" width={124} height={44} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
        </Stack>
      </Box>
      <Box sx={{ pt: { xs: 8, lg: 10 } }}>
        <TableSkeleton titleWidth={180} columns={4} rows={5} />
      </Box>
    </Stack>
  )
}

function TableSkeleton({ columns = 5, rows = 6, titleWidth = 190 }: { columns?: number; rows?: number; titleWidth?: number } = {}) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Skeleton variant="text" width={titleWidth} height={38} sx={{ mb: 2, bgcolor: 'divider' }} />
        <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
          {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
            <Box key={`mobile-row-skeleton-${index}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.5 }}>
              <Skeleton variant="text" width="72%" height={24} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width="52%" height={20} sx={{ bgcolor: 'divider' }} />
              <Stack direction="row" spacing={1} sx={{ mt: 1.2, justifyContent: 'space-between' }}>
                <Skeleton variant="rectangular" width="28%" height={34} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
                <Skeleton variant="rectangular" width="28%" height={34} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
                <Skeleton variant="rectangular" width="28%" height={34} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              </Stack>
            </Box>
          ))}
        </Stack>
        <Stack spacing={1.2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 1.5 }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={`table-head-skeleton-${index}`} variant="text" height={30} sx={{ bgcolor: 'divider' }} />
            ))}
          </Box>
          {Array.from({ length: rows }).map((_, index) => (
            <Box
              key={`table-row-skeleton-${index}`}
              sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 1.5 }}
            >
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton key={`table-cell-skeleton-${index}-${columnIndex}`} variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              ))}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function SummaryCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'secondary.main', color }}>
              {icon}
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h2">{value}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )
}
