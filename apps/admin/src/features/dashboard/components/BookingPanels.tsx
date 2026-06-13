import { Box, Chip, Stack, Typography } from '@mui/material'
import type { Booking, BookingStatus } from '../../../types/admin'
import { statusChipTextSx, statusLabels } from '../utils/bookingStatus'
import { BookingActionButtons } from './BookingActionButtons'

export function NextBookingPanel({ booking }: { booking: Booking }) {
  return (
    <Stack spacing={0.8}>
      <Typography variant="h3">ต้องจัดการตอนนี้</Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: 'primary.main', fontWeight: 950 }}>คิวถัดไป</Typography>
            <Typography sx={{ mt: 0.25, fontWeight: 950 }}>
              {booking.customerName} เวลา {booking.slotTime}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
              {booking.service?.nameTh ?? 'ยังไม่ได้ระบุบริการ'} · {booking.bookingCode}
            </Typography>
          </Box>
          <Chip label={statusLabels[booking.status]} color="primary" sx={statusChipTextSx(booking.status)} />
        </Stack>
      </Box>
    </Stack>
  )
}

export function BookingListSectionHeader({ hasBookings }: { hasBookings: boolean }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ mt: 1.2, mb: 1, justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h3">คิวอื่นของวันนี้</Typography>
        <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
          {hasBookings ? 'ดูรายละเอียดและจัดการคิวทั้งหมดของวันที่เลือก' : 'ยังไม่มีคิวอื่นในวันที่เลือก'}
        </Typography>
      </Box>
    </Stack>
  )
}

export function TodayFocusPanel({
  booking,
  onDeleteBooking,
  onEditBooking,
  onStatusChange,
  simpleMode,
}: {
  booking: Booking
  onDeleteBooking: (booking: Booking) => void
  onEditBooking: (booking: Booking) => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void | Promise<void>
  simpleMode: boolean
}) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2.5, bgcolor: '#FFFFFF', p: 1.6 }}>
      <Stack spacing={1.2}>
        <Box>
          <Typography variant="h3">วันนี้ต้องทำอะไร</Typography>
          <Typography sx={{ mt: 0.35, color: 'text.secondary', fontWeight: 760 }}>
            โฟกัสคิวถัดไปก่อน แล้วค่อยดูคิวอื่นของวันนี้
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: 'primary.main', fontWeight: 950 }}>{booking.bookingCode}</Typography>
            <Typography sx={{ fontWeight: 950 }}>
              {booking.customerName} เวลา {booking.slotTime}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
              {booking.service?.nameTh ?? 'ยังไม่ได้ระบุบริการ'} · {statusLabels[booking.status]}
            </Typography>
          </Box>
          <Box sx={{ minWidth: { xs: '100%', sm: 280 } }}>
            <BookingActionButtons
              booking={booking}
              simpleMode={simpleMode}
              onDeleteBooking={onDeleteBooking}
              onEditBooking={onEditBooking}
              onStatusChange={onStatusChange}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}
