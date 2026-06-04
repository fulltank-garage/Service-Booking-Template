import { useCallback, useEffect, useMemo, useState } from 'react'
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
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import RoomServiceIcon from '@mui/icons-material/RoomService'
import SearchIcon from '@mui/icons-material/Search'
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
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [latestRealtimeAt, setLatestRealtimeAt] = useState<Date | null>(null)
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading((bookings.length === 0 && notifications.length === 0) || false)
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
    } catch {
      setNotice('')
    } finally {
      setIsLoading(false)
    }
  }, [bookings.length, notifications.length])

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
            icon: '/pwa-icons/icon-192.svg',
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

      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: '100vh', pt: { xs: '72px', lg: 0 } }}>
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
            px: { xs: 2, sm: 2.5, lg: 3.5 },
            pt: { xs: 2, sm: 2.5, lg: '88px' },
            pb: { xs: 2, sm: 2.5, lg: 3.5 },
          }}
        >
          <Stack spacing={2.5}>
            <PushNotificationPrompt onNotice={setNotice} />

            {isLoading ? (
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
        left: { xs: 0, lg: 280 },
        right: 0,
        zIndex: 30,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        sx={{
          minHeight: 72,
          px: { xs: 1.5, sm: 2.5, lg: 3.5 },
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
                top: 5,
                right: 5,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'secondary.main',
                boxShadow: '0 0 0 4px rgba(245, 255, 0, 0.28)',
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
        top: { xs: 88, lg: 24 },
        left: { xs: '50%', lg: 'calc(280px + ((100vw - 280px) / 2))' },
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
        boxShadow: '0 14px 34px rgba(255, 0, 140, 0.24)',
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
  const statusColor = realtimeStatus === 'connected' ? '#10B981' : realtimeStatus === 'off' ? '#6B7280' : 'secondary.main'
  const latestLabel = latestRealtimeAt
    ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(latestRealtimeAt)
    : 'ยังไม่มีข้อมูลอัปเดต'

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: 3,
        bgcolor: '#1F1F1F',
        color: '#FFFFFF',
        p: 2,
      }}
    >
      <Stack spacing={1.6}>
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 950, lineHeight: 1.2 }}>{adminName}</Typography>
          <Typography sx={{ mt: 0.45, color: 'rgba(255,255,255,0.55)', fontSize: '0.84rem', fontWeight: 800, wordBreak: 'break-word' }}>
            {adminEmail}
          </Typography>
        </Box>

        <Box sx={{ border: '1px solid', borderColor: 'rgba(255,255,255,0.10)', borderRadius: 2.5, p: 1.5, bgcolor: '#080205' }}>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ mt: 0.55, width: 10, height: 10, borderRadius: '50%', bgcolor: statusColor, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 950, color: 'rgba(255,255,255,0.88)', lineHeight: 1.25 }}>
                {statusLabel[realtimeStatus]}
              </Typography>
              <Typography sx={{ mt: 0.7, color: 'rgba(255,255,255,0.44)', fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.5 }}>
                ข้อมูลล่าสุด {latestLabel}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: hasPendingAppUpdate ? 'rgba(255,0,140,0.36)' : 'rgba(255,255,255,0.10)',
            borderRadius: 2.5,
            p: 1.5,
            bgcolor: hasPendingAppUpdate ? 'rgba(255,0,140,0.10)' : '#080205',
          }}
        >
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'flex-start' }}>
            <Box
              className={hasPendingAppUpdate ? 'app-update-pulse' : undefined}
              sx={{
                mt: 0.55,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: hasPendingAppUpdate ? 'primary.main' : 'rgba(255,255,255,0.22)',
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 950, color: 'rgba(255,255,255,0.88)', lineHeight: 1.25 }}>
                อัปเดตแอป
              </Typography>
              <Typography sx={{ mt: 0.7, color: 'rgba(255,255,255,0.44)', fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.5 }}>
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
            borderColor: 'rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.78)',
            bgcolor: 'transparent',
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.24)',
              bgcolor: 'rgba(255,255,255,0.04)',
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
}: {
  services: ServiceItem[]
  onAddService: (service: ServiceItem) => void
}) {
  const [query, setQuery] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
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

  const closeEditor = () => {
    setIsEditorOpen(false)
    resetForm()
  }

  const handleAddService = () => {
    if (!canAdd) return

    onAddService({
      id: `service-${Date.now()}`,
      nameTh: nameTh.trim(),
      nameEn: nameTh.trim(),
      descriptionTh: descriptionTh.trim(),
      durationMinutes: Number(durationMinutes),
      priceCents: Math.round(Number(priceBaht) * 100),
      accentColor: '#FF008C',
      isActive: true,
    })
    closeEditor()
  }

  return (
    <>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <TextField
            placeholder="ค้นหาบริการ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ width: { xs: '100%', sm: 360 } }}
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsEditorOpen(true)}>
            เพิ่มบริการ
          </Button>
        </Stack>

        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
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
                    </TableRow>
                  ))}
                  {filteredServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 5, textAlign: 'center', color: 'text.secondary', fontWeight: 800 }}>
                        {services.length === 0 ? 'ยังไม่มีรายการบริการ' : 'ไม่พบบริการที่ค้นหา'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>

      <Dialog
        fullWidth
        maxWidth="sm"
        open={isEditorOpen}
        onClose={closeEditor}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 24px 70px rgba(17, 24, 39, 0.18)',
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 950 }}>เพิ่มบริการ</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={closeEditor}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={handleAddService} disabled={!canAdd}>
            บันทึกบริการ
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
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
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Skeleton variant="text" width={140} height={38} sx={{ mb: 2, bgcolor: 'divider' }} />
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={104} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        <TableSkeleton />
      </Grid>
    </Grid>
  )
}

function TableSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width={190} height={38} sx={{ mb: 2, bgcolor: 'divider' }} />
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Box
              key={`table-row-skeleton-${index}`}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr 1fr 1fr 150px' }, gap: 1.5 }}
            >
              <Skeleton variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
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
