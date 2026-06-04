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
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Portal,
  Select,
  Skeleton,
  Stack,
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
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import RoomServiceIcon from '@mui/icons-material/RoomService'
import SearchIcon from '@mui/icons-material/Search'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import WifiTetheringIcon from '@mui/icons-material/WifiTethering'
import { adminApi } from '../../api/adminApi'
import { BrandMark } from '../../components/BrandMark'
import { useAdminRealtime, type RealtimeStatus } from '../../hooks/useAdminRealtime'
import type { AdminNotification, Booking, BookingStatus, ServiceItem } from '../../types/admin'
import { PushNotificationPrompt } from '../notifications/PushNotificationPrompt'
import { registerAdminServiceWorker } from '../notifications/pushNotifications'

const statusLabels: Record<BookingStatus, string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

const pageLabels = {
  overview: 'จัดการคิวจองบริการ',
  bookings: 'รายการจอง',
  services: 'บริการของร้าน',
} as const

const formatThaiPrice = (priceCents: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(priceCents / 100)

const SIDEBAR_WIDTH = 280
const MOBILE_TOPBAR_OFFSET = 'calc(104px + env(safe-area-inset-top))'
const MOBILE_TOOLBAR_TOP = 'calc(104px + env(safe-area-inset-top) + 20px)'

type AdminPage = keyof typeof pageLabels

type DashboardPageProps = {
  adminEmail: string
  adminName: string
  applyAppUpdate: () => void
  hasPendingAppUpdate: boolean
  onLogout: () => void
}

export function DashboardPage({ adminEmail, adminName, applyAppUpdate, hasPendingAppUpdate, onLogout }: DashboardPageProps) {
  const [activePage, setActivePage] = useState<AdminPage>('overview')
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shouldShowDataSkeleton, setShouldShowDataSkeleton] = useState(false)
  const hasLoadedDataRef = useRef(false)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [latestRealtimeAt, setLatestRealtimeAt] = useState<Date | null>(null)
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async () => {
    if (!hasLoadedDataRef.current) {
      setIsLoading(true)
    }

    try {
      const [bookingItems, notificationItems, serviceItems] = await Promise.all([
        adminApi.listBookings(),
        adminApi.listNotifications(),
        adminApi.listServices(),
      ])
      setBookings(bookingItems)
      setServices(serviceItems)
      setNotifications(notificationItems)
      setLatestRealtimeAt(new Date())
      hasLoadedDataRef.current = true
    } catch {
      setNotice('')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setShouldShowDataSkeleton(isLoading), isLoading ? 180 : 0)
    return () => window.clearTimeout(timer)
  }, [isLoading])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
      void registerAdminServiceWorker()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loadData])

  useAdminRealtime({
    onNotification: useCallback(
      (notification) => {
        setNotifications((current) => [notification, ...current])
        const isNewBooking = notification.type === 'booking.created'
        const message = isNewBooking ? 'มีคิวจองใหม่' : notification.title
        setNotice(message)

        if (isNewBooking && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('มีคิวจองใหม่', {
            body: notification.body || 'มีรายการจองใหม่ในระบบ',
            icon: '/pwa-icons/booking-queue-icon-192.png',
          })
        }
      },
      [],
    ),
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
    setBookings((current) => current.map((item) => (item.id === booking.id ? { ...item, status } : item)))
    try {
      await adminApi.updateBookingStatus(booking.id, status)
      setNotice('อัปเดตสถานะคิวแล้ว')
    } catch {
      setNotice('อัปเดตสถานะไม่สำเร็จ')
      void loadData()
    }
  }

  const handleChangePage = (page: AdminPage) => {
    setActivePage(page)
    setIsNavOpen(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
        onApplyAppUpdate={applyAppUpdate}
        onChangePage={handleChangePage}
        onClose={() => setIsNavOpen(false)}
        onLogout={onLogout}
      />

      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: '100vh', pt: { xs: MOBILE_TOPBAR_OFFSET, lg: 0 } }}>
        <Sidebar
          activePage={activePage}
          adminEmail={adminEmail}
          adminName={adminName}
          hasPendingAppUpdate={hasPendingAppUpdate}
          latestRealtimeAt={latestRealtimeAt}
          realtimeStatus={realtimeStatus}
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
                  <BookingsPage bookings={bookings} onStatusChange={handleStatusChange} />
                )}
                {activePage === 'services' && (
                  <ServicesPage
                    services={services}
                    onAddService={(service) => {
                      setServices((current) => [service, ...current])
                      setNotice('เพิ่มบริการของร้านแล้ว')
                    }}
                    onDeleteService={(serviceId) => {
                      setServices((current) => current.filter((service) => service.id !== serviceId))
                      setNotice('ลบบริการของร้านแล้ว')
                    }}
                    onUpdateService={(nextService) => {
                      setServices((current) => current.map((service) => (service.id === nextService.id ? nextService : service)))
                      setNotice('แก้ไขบริการของร้านแล้ว')
                    }}
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
        pt: { xs: 'env(safe-area-inset-top)', lg: 0 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          minHeight: { xs: 104, sm: 92, lg: 72 },
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
            width: 46,
            height: 46,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            display: { xs: 'inline-flex', lg: 'none' },
          }}
        >
          <MenuIcon />
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
        top: { xs: `calc(${MOBILE_TOPBAR_OFFSET} + 12px)`, lg: 24 },
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
      sx={{
        display: { xs: 'block', lg: 'none' },
        '& .MuiDrawer-paper': {
          width: { xs: 'min(84vw, 320px)', sm: 340 },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRight: '1px solid',
          borderColor: 'divider',
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
          <IconButton
            aria-label="ปิดเมนู"
            onClick={onClose}
            sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', color: 'text.primary' }}
          >
            <CloseIcon />
          </IconButton>
        }
        latestRealtimeAt={latestRealtimeAt}
        realtimeStatus={realtimeStatus}
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
  onApplyAppUpdate: () => void
  onChangePage: (page: AdminPage) => void
  onLogout: () => void
}) {
  const navItems: Array<{ page: AdminPage; label: string; icon: ReactNode }> = [
    { page: 'overview', label: 'ภาพรวม', icon: <DashboardIcon /> },
    { page: 'services', label: 'บริการของร้าน', icon: <RoomServiceIcon /> },
    { page: 'bookings', label: 'รายการจอง', icon: <CalendarMonthIcon /> },
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
                  justifyContent: compact ? 'center' : 'flex-start',
                  minHeight: compact ? 50 : 58,
                  minWidth: 0,
                  px: compact ? 0 : 2.5,
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
        <SummaryCard icon={<HourglassTopIcon />} label="รอยืนยัน" value={summary.pending} color="#FF008C" />
        <SummaryCard icon={<CheckCircleIcon />} label="ยืนยันแล้ว" value={summary.confirmed} color="#111827" />
        <SummaryCard icon={<CalendarMonthIcon />} label="คิวทั้งหมด" value={summary.total} color="#FF008C" />
        <SummaryCard icon={<NotificationsIcon />} label="แจ้งเตือนยังไม่อ่าน" value={summary.unread} color="#111827" />
      </Grid>
    </Stack>
  )
}

function BookingsPage({
  bookings,
  onStatusChange,
}: {
  bookings: Booking[]
  onStatusChange: (booking: Booking, status: BookingStatus) => void
}) {
  return <BookingsCard bookings={bookings} onStatusChange={onStatusChange} />
}

function ServicesPage({
  services,
  onAddService,
  onDeleteService,
  onUpdateService,
}: {
  services: ServiceItem[]
  onAddService: (service: ServiceItem) => void
  onDeleteService: (serviceId: string) => void
  onUpdateService: (service: ServiceItem) => void
}) {
  const [query, setQuery] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null)
  const [nameTh, setNameTh] = useState('')
  const [priceBaht, setPriceBaht] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [descriptionTh, setDescriptionTh] = useState('')

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
    }, 280)
  }

  const handleSaveService = () => {
    if (!canAdd) return

    const nextService: ServiceItem = {
      id: editingService?.id ?? `service-${Date.now()}`,
      nameTh: nameTh.trim(),
      nameEn: editingService?.nameEn ?? nameTh.trim(),
      descriptionTh: descriptionTh.trim(),
      durationMinutes: Number(durationMinutes),
      priceCents: Math.round(Number(priceBaht) * 100),
      accentColor: editingService?.accentColor ?? '#FF008C',
      isActive: editingService?.isActive ?? true,
    }

    if (editingService) {
      onUpdateService(nextService)
    } else {
      onAddService(nextService)
    }

    closeEditor()
  }

  const handleDeleteService = () => {
    if (!serviceToDelete) return
    onDeleteService(serviceToDelete.id)
    setServiceToDelete(null)
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

      <Box component="section" sx={{ pt: { xs: 9.5, lg: 10 } }}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <Typography variant="h2">รายการบริการของร้าน</Typography>
              <Chip color="secondary" label={`${filteredServices.length} รายการ`} />
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
                      <Chip color={service.isActive ? 'secondary' : 'default'} label={service.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEditor(service)}>
                        แก้ไข
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<DeleteIcon />}
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
                        <Chip color={service.isActive ? 'secondary' : 'default'} label={service.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEditor(service)}>
                            แก้ไข
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<DeleteIcon />}
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
                  type="number"
                  value={priceBaht}
                  onChange={(event) => setPriceBaht(event.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="เวลาที่ใช้ (นาที)"
                  type="number"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
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
              <Stack spacing={1.2}>
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 950, lineHeight: 1.25 }}>
                      {previewName}
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.82rem',
                        fontWeight: 760,
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {previewDescription}
                    </Typography>
                  </Box>
                  <Chip color="secondary" label={previewDuration} />
                </Stack>
                <Typography sx={{ color: 'primary.main', fontWeight: 950 }}>{previewPrice}</Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={closeEditor}>
                ยกเลิก
              </Button>
              <Button variant="contained" type="submit" disabled={!canAdd}>
                {editingService ? 'บันทึกการแก้ไข' : 'บันทึกบริการ'}
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 950 }}>ยืนยันการลบบริการ</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
            ต้องการลบ {serviceToDelete?.nameTh ?? 'บริการนี้'} ใช่หรือไม่
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={() => setServiceToDelete(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteService}
            sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
          >
            ยืนยันลบ
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
        top: { xs: MOBILE_TOOLBAR_TOP, lg: 88 },
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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} sx={{ minHeight: 44, px: { xs: 1.4, sm: 2 } }}>
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
        data-testid="service-editor-overlay"
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
          component="button"
          aria-label="ปิดฟอร์ม"
          type="button"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            border: 0,
            bgcolor: 'rgba(17, 24, 39, 0.42)',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 260ms ease',
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
            transform: isOpen ? 'translate(-50%, -50%)' : 'translate(-50%, calc(60% + 80px))',
            opacity: isOpen ? 1 : 0,
            transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
            willChange: 'transform',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', p: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: '1.1rem', fontWeight: 950 }}>{title}</Typography>
            <IconButton aria-label="ปิดฟอร์ม" onClick={onClose} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CloseIcon />
            </IconButton>
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
  onStatusChange,
}: {
  bookings: Booking[]
  onStatusChange: (booking: Booking, status: BookingStatus) => void
}) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          รายการจองล่าสุด
        </Typography>
        <TableContainer>
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
                    {booking.bookingDate} {booking.slotTime}
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={booking.status}
                      onChange={(event) => onStatusChange(booking, event.target.value as BookingStatus)}
                      sx={{ borderRadius: 2, minWidth: 136 }}
                    >
                      {Object.entries(statusLabels).map(([status, label]) => (
                        <MenuItem key={status} value={status}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
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
          top: { xs: MOBILE_TOOLBAR_TOP, lg: 88 },
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
      <Box sx={{ pt: { xs: 9.5, lg: 10 } }}>
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
