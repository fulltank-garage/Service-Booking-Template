import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { Booking, BookingStatus } from '../../../types/admin'
import { formatThaiDateLabel } from '../../../utils/dateFormat'
import { isClosedBookingStatus, statusChipTextSx, statusLabels } from '../utils/bookingStatus'
import { BookingActionButtons } from './BookingActionButtons'

type BookingListProps = {
  bookings: Booking[]
  onDeleteBooking: (booking: Booking) => void
  onEditBooking: (booking: Booking) => void
  onOpenCreate: () => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void
  simpleMode: boolean
}

export function EmptyBookingState({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', py: 5, px: 2, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>ยังไม่มีรายการจอง</Typography>
      <Typography sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 760 }}>ถ้ามีลูกค้าโทรมาหรือเดินเข้าร้าน สามารถเพิ่มคิวเองได้ทันที</Typography>
      <Button variant="contained" sx={{ mt: 1.5 }} onClick={onOpenCreate}>
        เพิ่มคิวโทร/หน้าร้าน
      </Button>
    </Box>
  )
}

export function BookingMobileList(props: BookingListProps) {
  return (
    <Stack data-testid="booking-mobile-list" spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {props.bookings.map((booking) => (
        <Box key={booking.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.5 }}>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 950, lineHeight: 1.25 }}>{booking.bookingCode}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.86rem', fontWeight: 760 }}>{booking.customerName}</Typography>
              </Box>
              <Chip color={isClosedBookingStatus(booking.status) ? 'secondary' : 'primary'} label={statusLabels[booking.status]} sx={{ ...statusChipTextSx(booking.status), flexShrink: 0 }} />
            </Stack>
            <BookingSummary booking={booking} />
            <BookingActionButtons booking={booking} simpleMode={props.simpleMode} onDeleteBooking={props.onDeleteBooking} onEditBooking={props.onEditBooking} onStatusChange={props.onStatusChange} />
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

export function BookingDesktopTable(props: BookingListProps) {
  return (
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
          {props.bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell sx={{ fontWeight: 800 }}>{booking.bookingCode}</TableCell>
              <TableCell>
                <Typography sx={{ fontWeight: 760 }}>{booking.customerName}</Typography>
                <Typography variant="body2" color="text.secondary">{booking.phone}</Typography>
                {booking.noShowCount ? <Typography variant="body2" color="text.secondary">ไม่มาตามนัด {booking.noShowCount} ครั้ง</Typography> : null}
              </TableCell>
              <TableCell>{booking.service?.nameTh ?? '-'}</TableCell>
              <TableCell>{formatThaiDateLabel(booking.bookingDate)} {booking.slotTime}</TableCell>
              <TableCell>
                <Stack spacing={1}>
                  <Chip color={isClosedBookingStatus(booking.status) ? 'secondary' : 'primary'} label={statusLabels[booking.status]} sx={statusChipTextSx(booking.status)} />
                  <BookingActionButtons booking={booking} simpleMode={props.simpleMode} onDeleteBooking={props.onDeleteBooking} onEditBooking={props.onEditBooking} onStatusChange={props.onStatusChange} />
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.86rem', fontWeight: 850 }}>{booking.service?.nameTh ?? '-'}</Typography>
      <Stack spacing={0.35} sx={{ mt: 0.6 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>วันที่: {formatThaiDateLabel(booking.bookingDate)}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>เวลา: {booking.slotTime}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>เบอร์โทร: {booking.phone}</Typography>
        {booking.noShowCount ? <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', fontWeight: 760 }}>ไม่มาตามนัดสะสม: {booking.noShowCount} ครั้ง</Typography> : null}
      </Stack>
    </Box>
  )
}
