import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { bookingApi } from '../../api/bookingApi'
import type { Booking } from '../../types/booking'
import type { LineProfile } from '../../integrations/liff'

const statusLabels: Record<Booking['status'], string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

type BookingSuccessPageProps = {
  fallbackBooking: Booking | null
  lineProfile: LineProfile | null
  onStartBooking: () => void
}

export function BookingSuccessPage({ fallbackBooking, lineProfile, onStartBooking }: BookingSuccessPageProps) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(lineProfile?.userId))
  const [error, setError] = useState('')
  const displayedBooking = lineProfile?.userId ? booking : fallbackBooking

  useEffect(() => {
    if (!lineProfile?.userId) {
      return
    }

    let active = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const latestBooking = await bookingApi.latestBookingByLineUser(lineProfile.userId)
        if (active) setBooking(latestBooking)
      } catch {
        if (active) {
          setBooking(fallbackBooking)
          setError('โหลดข้อมูลการจองล่าสุดไม่สำเร็จ')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [fallbackBooking, lineProfile?.userId])

  if (isLoading) {
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={2}>
            <Skeleton variant="text" width={190} height={44} sx={{ bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (!displayedBooking) {
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={2}>
            <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>
              ยังไม่พบข้อมูลการจอง
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
              เริ่มจองคิวใหม่เพื่อให้ระบบแสดงข้อมูลการจองของคุณในหน้านี้
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" onClick={onStartBooking}>
              เริ่มการจอง
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.4}>
          <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 2.4,
                bgcolor: 'secondary.main',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 34 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h2" sx={{ fontSize: '1.75rem' }}>
                ข้อมูลการจอง
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>{displayedBooking.bookingCode}</Typography>
            </Box>
          </Stack>

          {error && <Alert severity="warning">{error}</Alert>}

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
            <Typography sx={{ fontWeight: 950, fontSize: '1.2rem' }}>
              {displayedBooking.service?.nameTh ?? 'บริการที่เลือก'}
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              สถานะ: {statusLabels[displayedBooking.status]}
            </Typography>
          </Box>

          <Grid container spacing={1.4}>
            <SummaryItem label="ชื่อผู้จอง" value={displayedBooking.customerName} />
            <SummaryItem label="เบอร์โทร" value={displayedBooking.phone} />
            <SummaryItem label="วันที่" value={displayedBooking.bookingDate} />
            <SummaryItem label="เวลา" value={displayedBooking.slotTime} />
          </Grid>

          <Divider />
          <Button variant="contained" onClick={onStartBooking}>
            จองคิวใหม่
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 900 }}>{value}</Typography>
      </Box>
    </Grid>
  )
}
