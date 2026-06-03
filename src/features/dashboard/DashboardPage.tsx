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
  Grid,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import LogoutIcon from '@mui/icons-material/Logout'
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ minHeight: '100vh' }}>
        <Sidebar
          activePage={activePage}
          adminEmail={adminEmail}
          onChangePage={setActivePage}
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
  const navItems: Array<{ page: AdminPage; label: string; icon: ReactNode }> = [
    { page: 'overview', label: 'ภาพรวม', icon: <DashboardIcon /> },
    { page: 'bookings', label: 'รายการจอง', icon: <CalendarMonthIcon /> },
    { page: 'notifications', label: 'แจ้งเตือน', icon: <NotificationsIcon /> },
  ]

  return (
    <Box
      component="aside"
      sx={{
        width: { xs: '100%', sm: 88, lg: 280 },
        flexShrink: 0,
        borderRight: { xs: 0, sm: '1px solid' },
        borderBottom: { xs: '1px solid', sm: 0 },
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        maxHeight: { xs: 'none', sm: '100vh' },
      }}
    >
      <Stack
        sx={{
          minHeight: { xs: 'auto', sm: '100vh' },
          p: { xs: 1.5, sm: 1.25, lg: 2.5 },
          overflowY: { xs: 'visible', sm: 'auto' },
        }}
        spacing={{ xs: 1.25, sm: 1.5, lg: 2 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'flex-start', sm: 'center', lg: 'flex-start' },
            '& p': { display: { xs: 'block', sm: 'none', lg: 'block' } },
          }}
        >
          <BrandMark />
        </Box>
        <Stack
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: '1fr' },
            gap: 1,
          }}
        >
          {navItems.map((item) => {
            const isActive = activePage === item.page
            return (
              <Tooltip key={item.page} title={item.label} placement="right">
                <Button
                  fullWidth
                  variant={isActive ? 'contained' : 'outlined'}
                  startIcon={item.icon}
                  aria-label={item.label}
                  onClick={() => onChangePage(item.page)}
                  sx={{
                    justifyContent: { xs: 'center', sm: 'center', lg: 'flex-start' },
                    minWidth: 0,
                    px: { xs: 1, sm: 0, lg: 2.25 },
                    bgcolor: isActive ? 'primary.main' : 'background.default',
                    '& .MuiButton-startIcon': {
                      mr: { xs: 0.75, sm: 0, lg: 1 },
                      ml: 0,
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'inline', sm: 'none', lg: 'inline' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: { xs: '0.82rem', lg: 'inherit' },
                    }}
                  >
                    {item.label}
                  </Box>
                </Button>
              </Tooltip>
            )
          })}
        </Stack>
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        <Stack spacing={1} sx={{ mt: { xs: 0.25, sm: 'auto' } }}>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: { xs: 'block', sm: 'none', lg: 'block' },
              fontWeight: 760,
              wordBreak: 'break-word',
            }}
          >
            {adminEmail}
          </Typography>
          <Tooltip title="ออกจากระบบ" placement="right">
            <Button
              variant="outlined"
              onClick={onLogout}
              startIcon={<LogoutIcon />}
              aria-label="ออกจากระบบ"
              sx={{
                justifyContent: { xs: 'center', sm: 'center', lg: 'flex-start' },
                minWidth: 0,
                px: { xs: 2, sm: 0, lg: 2.25 },
                '& .MuiButton-startIcon': {
                  mr: { xs: 1, sm: 0, lg: 1 },
                  ml: 0,
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none', lg: 'inline' } }}>
                ออกจากระบบ
              </Box>
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
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
