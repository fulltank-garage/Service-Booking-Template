import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import NotificationsIcon from '@mui/icons-material/Notifications'
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

export function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [bookingItems, notificationItems] = await Promise.all([
        adminApi.listBookings(),
        adminApi.listNotifications(),
      ])
      setBookings(bookingItems)
      setNotifications(notificationItems)
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ')
    }
  }, [])

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
    onNotification: useCallback((notification) => {
      setNotifications((current) => [notification, ...current])
      setNotice(notification.title)
      void loadData()
    }, [loadData]),
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
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
            <BrandMark />
            <Button variant="contained" onClick={loadData}>
              รีเฟรชข้อมูล
            </Button>
          </Stack>

          <Box>
            <Typography variant="h1">จัดการคิวจองบริการ</Typography>
            <Typography sx={{ mt: 1, maxWidth: 760, color: 'text.secondary' }}>
              ติดตามคิวใหม่ อัปเดตสถานะ และดูรายการแจ้งเตือนของงานบริการในหน้าเดียว
            </Typography>
          </Box>

          <PushNotificationPrompt onNotice={setNotice} />
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <SummaryCard icon={<HourglassTopIcon />} label="รอยืนยัน" value={summary.pending} color="#FF008C" />
            <SummaryCard icon={<CheckCircleIcon />} label="ยืนยันแล้ว" value={summary.confirmed} color="#111827" />
            <SummaryCard icon={<CalendarMonthIcon />} label="คิวทั้งหมด" value={summary.total} color="#FF008C" />
            <SummaryCard icon={<NotificationsIcon />} label="แจ้งเตือนยังไม่อ่าน" value={summary.unread} color="#111827" />
          </Grid>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 8 }}>
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
                              <Typography variant="body2" color="text.secondary">{booking.phone}</Typography>
                            </TableCell>
                            <TableCell>{booking.service?.nameTh ?? '-'}</TableCell>
                            <TableCell>{booking.bookingDate} {booking.slotTime}</TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={booking.status}
                                onChange={(event) => void handleStatusChange(booking, event.target.value as BookingStatus)}
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
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
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
                          <Typography variant="body2" color="text.secondary">{notification.body}</Typography>
                        </Stack>
                        {index < notifications.length - 1 && <Divider sx={{ mt: 2 }} />}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>

      <Snackbar open={Boolean(notice)} autoHideDuration={3200} onClose={() => setNotice('')} message={notice} />
    </Box>
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
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h2">{value}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )
}
