import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import RefreshIcon from '@mui/icons-material/Refresh'
import { adminApi } from '../../api/adminApi'
import { BrandMark } from '../../components/BrandMark'
import { useAdminRealtime } from '../../hooks/useAdminRealtime'
import type { AdminNotification, Booking, BookingStatus } from '../../types/admin'
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
  notifications: 'แจ้งเตือน',
} as const

type AdminPage = keyof typeof pageLabels

type DashboardPageProps = {
  adminEmail: string
  onLogout: () => void
}

export function DashboardPage({ adminEmail, onLogout }: DashboardPageProps) {
  const [activePage, setActivePage] = useState<AdminPage>('overview')
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    setIsLoading((bookings.length === 0 && notifications.length === 0) || false)
    try {
      const [bookingItems, notificationItems] = await Promise.all([
        adminApi.listBookings(),
        adminApi.listNotifications(),
      ])
      setBookings(bookingItems)
      setNotifications(notificationItems)
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ')
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
        setNotice(notification.title)
        void loadData()
      },
      [loadData],
    ),
  })

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
      setError('อัปเดตสถานะไม่สำเร็จ')
      void loadData()
    }
  }

  const handleChangePage = (page: AdminPage) => {
    setActivePage(page)
    setIsNavOpen(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MobileHeader onOpenNav={() => setIsNavOpen(true)} />
      <MobileNavDrawer
        activePage={activePage}
        adminEmail={adminEmail}
        open={isNavOpen}
        onChangePage={handleChangePage}
        onClose={() => setIsNavOpen(false)}
        onLogout={onLogout}
      />

      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: '100vh' }}>
        <Sidebar
          activePage={activePage}
          adminEmail={adminEmail}
          onChangePage={handleChangePage}
          onLogout={onLogout}
        />

        <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 2.5, lg: 3.5 }, py: { xs: 2, sm: 2.5, lg: 3.5 } }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
            >
              <Box>
                <Typography variant="h1">{pageLabels[activePage]}</Typography>
                <Typography sx={{ mt: 0.8, maxWidth: 760, color: 'text.secondary' }}>
                  ติดตามคิวใหม่ อัปเดตสถานะ และดูรายการแจ้งเตือนของงานบริการ
                </Typography>
              </Box>
              <Button variant="contained" onClick={loadData} startIcon={<RefreshIcon />}>
                รีเฟรชข้อมูล
              </Button>
            </Stack>

            <PushNotificationPrompt onNotice={setNotice} />
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                {error}
              </Alert>
            )}

            {isLoading ? (
              <DashboardSkeleton activePage={activePage} />
            ) : (
              <>
                {activePage === 'overview' && (
                  <OverviewPage
                    bookings={bookings}
                    notifications={notifications}
                    summary={summary}
                    onStatusChange={handleStatusChange}
                  />
                )}
                {activePage === 'bookings' && (
                  <BookingsPage bookings={bookings} onStatusChange={handleStatusChange} />
                )}
                {activePage === 'notifications' && <NotificationsPage notifications={notifications} />}
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={3200} onClose={() => setNotice('')} message={notice} />
    </Box>
  )
}

function MobileHeader({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <Box
      component="header"
      sx={{
        display: { xs: 'block', lg: 'none' },
        position: 'sticky',
        top: 0,
        zIndex: 20,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" sx={{ minHeight: 72, px: { xs: 1.5, sm: 2.5 }, alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton
          aria-label="เปิดเมนู"
          onClick={onOpenNav}
          sx={{
            width: 46,
            height: 46,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: 'flex', justifyContent: 'center', flex: 1, mx: 1.5 }}>
          <BrandMark />
        </Box>
        <Box sx={{ width: 46, height: 46 }} />
      </Stack>
    </Box>
  )
}

function MobileNavDrawer({
  activePage,
  adminEmail,
  open,
  onChangePage,
  onClose,
  onLogout,
}: {
  activePage: AdminPage
  adminEmail: string
  open: boolean
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
        compact={false}
        headerAction={
          <IconButton
            aria-label="ปิดเมนู"
            onClick={onClose}
            sx={{ border: '1px solid', borderColor: 'divider', color: 'text.primary' }}
          >
            <CloseIcon />
          </IconButton>
        }
        onChangePage={onChangePage}
        onLogout={onLogout}
      />
    </Drawer>
  )
}

function Sidebar({
  activePage,
  adminEmail,
  onChangePage,
  onLogout,
}: {
  activePage: AdminPage
  adminEmail: string
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
        compact={false}
        onChangePage={onChangePage}
        onLogout={onLogout}
      />
    </Box>
  )
}

function SidebarContent({
  activePage,
  adminEmail,
  compact,
  headerAction,
  onChangePage,
  onLogout,
}: {
  activePage: AdminPage
  adminEmail: string
  compact: boolean
  headerAction?: ReactNode
  onChangePage: (page: AdminPage) => void
  onLogout: () => void
}) {
  const navItems: Array<{ page: AdminPage; label: string; icon: ReactNode }> = [
    { page: 'overview', label: 'ภาพรวม', icon: <DashboardIcon /> },
    { page: 'bookings', label: 'รายการจอง', icon: <CalendarMonthIcon /> },
    { page: 'notifications', label: 'แจ้งเตือน', icon: <NotificationsIcon /> },
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
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: compact ? 'center' : 'flex-start', '& p': { display: compact ? 'none' : 'block' } }}>
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
                  minWidth: 0,
                  px: compact ? 0 : 2.25,
                  bgcolor: isActive ? 'primary.main' : 'background.default',
                  '& .MuiButton-startIcon': {
                    mr: compact ? 0 : 1,
                    ml: 0,
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
      <Stack spacing={1}>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', display: compact ? 'none' : 'block', fontWeight: 760, wordBreak: 'break-word' }}
        >
          {adminEmail}
        </Typography>
        <Tooltip title={compact ? 'ออกจากระบบ' : ''} placement="right">
          <Button
            variant="outlined"
            onClick={onLogout}
            startIcon={<LogoutIcon />}
            aria-label="ออกจากระบบ"
            sx={{
              justifyContent: compact ? 'center' : 'flex-start',
              minWidth: 0,
              px: compact ? 0 : 2.25,
              '& .MuiButton-startIcon': {
                mr: compact ? 0 : 1,
                ml: 0,
              },
            }}
          >
            <Box component="span" sx={{ display: compact ? 'none' : 'inline' }}>
              ออกจากระบบ
            </Box>
          </Button>
        </Tooltip>
      </Stack>
    </Stack>
  )
}

function OverviewPage({
  bookings,
  notifications,
  summary,
  onStatusChange,
}: {
  bookings: Booking[]
  notifications: AdminNotification[]
  summary: { pending: number; confirmed: number; unread: number; total: number }
  onStatusChange: (booking: Booking, status: BookingStatus) => void
}) {
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <SummaryCard icon={<HourglassTopIcon />} label="รอยืนยัน" value={summary.pending} color="#FF008C" />
        <SummaryCard icon={<CheckCircleIcon />} label="ยืนยันแล้ว" value={summary.confirmed} color="#111827" />
        <SummaryCard icon={<CalendarMonthIcon />} label="คิวทั้งหมด" value={summary.total} color="#FF008C" />
        <SummaryCard icon={<NotificationsIcon />} label="แจ้งเตือนยังไม่อ่าน" value={summary.unread} color="#111827" />
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <BookingsCard bookings={bookings.slice(0, 5)} onStatusChange={onStatusChange} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <NotificationsCard notifications={notifications.slice(0, 5)} />
        </Grid>
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

function NotificationsPage({ notifications }: { notifications: AdminNotification[] }) {
  return <NotificationsCard notifications={notifications} />
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

function NotificationsCard({ notifications }: { notifications: AdminNotification[] }) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          รายการแจ้งเตือน
        </Typography>
        <Stack spacing={2}>
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
              <Stack spacing={0.8}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 820 }}>{notification.title}</Typography>
                  {!notification.isRead && <Chip size="small" color="secondary" label="ใหม่" />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {notification.body}
                </Typography>
              </Stack>
              {index < notifications.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton({ activePage }: { activePage: AdminPage }) {
  if (activePage === 'notifications') {
    return <NotificationsSkeleton />
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
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <TableSkeleton />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <NotificationsSkeleton />
        </Grid>
      </Grid>
    </Stack>
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

function NotificationsSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width={180} height={38} sx={{ mb: 2, bgcolor: 'divider' }} />
        <Stack spacing={2}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Box key={`notification-skeleton-${index}`}>
              <Skeleton variant="text" width="75%" height={28} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width="100%" height={24} sx={{ bgcolor: 'divider' }} />
              {index < 4 && <Divider sx={{ mt: 2 }} />}
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
