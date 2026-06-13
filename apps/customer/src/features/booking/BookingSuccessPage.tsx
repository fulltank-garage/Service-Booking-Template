import { Alert, Box, Button, Card, CardContent, Divider, FormControl, Grid, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { Booking } from '../../types/booking'
import type { LineProfile } from '../../integrations/liff'
import { formatThaiDateLabel } from '../../utils/dateFormat'
import { BookingStatusNotice } from './components/BookingStatusNotice'
import { BookingSuccessSkeleton } from './components/BookingSuccessSkeleton'
import { BottomEditorSheet } from './components/BottomEditorSheet'
import { SummaryItem } from './components/SummaryItem'
import { useBookingSuccessPage } from './hooks/useBookingSuccessPage'

type BookingSuccessPageProps = {
  autoCloseOnSuccess?: boolean
  fallbackBooking: Booking | null
  lineProfile: LineProfile | null
  onBookingCancelled: () => void
  onBookingUpdated?: (booking: Booking) => void
}

export function BookingSuccessPage(props: BookingSuccessPageProps) {
  const {
    displayedBooking,
    error,
    handleCancelBooking,
    handleRescheduleBooking,
    isCancelling,
    isLoading,
    isLoadingSlots,
    isRescheduleOpen,
    isRescheduling,
    openRescheduleDialog,
    rescheduleDate,
    rescheduleNotes,
    rescheduleSlot,
    rescheduleSlotSelectValue,
    setIsRescheduleOpen,
    setRescheduleDate,
    setRescheduleNotes,
    setRescheduleSlot,
    slots,
    todayKey,
  } = useBookingSuccessPage({ ...props, autoCloseOnSuccess: props.autoCloseOnSuccess ?? false })

  if (isLoading) return <BookingSuccessSkeleton />

  if (!displayedBooking) {
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={2}>
            <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>
              ยังไม่พบข้อมูลการจอง
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>เริ่มการจองเพื่อให้ระบบแสดงข้อมูลการจองของคุณในหน้านี้</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" onClick={props.onBookingCancelled}>
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
          <BookingSuccessHeader booking={displayedBooking} />
          {error && <Alert severity="warning">{error}</Alert>}
          <BookingStatusNotice status={displayedBooking.status} />
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
            <Typography sx={{ fontWeight: 950, fontSize: '1.2rem' }}>{displayedBooking.service?.nameTh ?? 'บริการที่เลือก'}</Typography>
          </Box>
          <Grid container spacing={1.4}>
            <SummaryItem label="ชื่อผู้จอง" value={displayedBooking.customerName} />
            <SummaryItem label="เบอร์โทร" value={displayedBooking.phone} />
            <SummaryItem label="วันที่" value={formatThaiDateLabel(displayedBooking.bookingDate)} />
            <SummaryItem label="เวลา" value={displayedBooking.slotTime} />
          </Grid>
          <Divider />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" disabled={!props.lineProfile?.userId || isCancelling} onClick={openRescheduleDialog}>
              เลื่อนนัด
            </Button>
            <Button variant="contained" disabled={!props.lineProfile?.userId || isCancelling} onClick={handleCancelBooking}>
              {isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
      <BottomEditorSheet isOpen={isRescheduleOpen} onClose={() => setIsRescheduleOpen(false)} title="เลื่อนนัด">
        <Stack spacing={2}>
          <TextField fullWidth label="วันที่" type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} slotProps={{ htmlInput: { min: todayKey } }} />
          <FormControl fullWidth>
            <Select aria-label="เวลาใหม่" value={isLoadingSlots ? '' : rescheduleSlotSelectValue} disabled={isLoadingSlots} onChange={(event) => setRescheduleSlot(event.target.value)} displayEmpty>
              <MenuItem value="" disabled>
                {isLoadingSlots ? 'กำลังโหลดเวลา...' : 'เลือกเวลาใหม่'}
              </MenuItem>
              {slots.map((slot) => (
                <MenuItem key={slot.time} value={slot.time} disabled={!slot.available}>
                  {slot.time} {slot.available ? 'ว่าง' : 'ไม่ว่าง'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth multiline minRows={3} label="หมายเหตุ" value={rescheduleNotes} onChange={(event) => setRescheduleNotes(event.target.value)} />
          <Stack direction="row" spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" disabled={isRescheduling} onClick={() => setIsRescheduleOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="contained" disabled={!rescheduleDate || !rescheduleSlot || isRescheduling} onClick={handleRescheduleBooking}>
              {isRescheduling ? 'กำลังบันทึก...' : 'บันทึกการเลื่อนนัด'}
            </Button>
          </Stack>
        </Stack>
      </BottomEditorSheet>
    </Card>
  )
}

function BookingSuccessHeader({ booking }: { booking: Booking }) {
  return (
    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 54, height: 54, borderRadius: 2.4, bgcolor: 'secondary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 34 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h2" sx={{ fontSize: '1.75rem' }}>
          ข้อมูลการจอง
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>{booking.bookingCode}</Typography>
      </Box>
    </Stack>
  )
}
