import { Box, Typography } from '@mui/material'
import type { Booking } from '../../../types/booking'

const bookingStatusCopy: Record<Booking['status'], { title: string; description: string }> = {
  pending: {
    title: 'ร้านได้รับคิวแล้ว',
    description: 'รอร้านตรวจสอบและยืนยันคิวให้คุณ',
  },
  confirmed: {
    title: 'ร้านยืนยันคิวแล้ว',
    description: 'กรุณามาตามวันและเวลานัด',
  },
  completed: {
    title: 'ใช้บริการเรียบร้อยแล้ว',
    description: 'คุณสามารถจองคิวใหม่ได้เมื่อต้องการ',
  },
  cancelled: {
    title: 'คิวนี้ถูกยกเลิกแล้ว',
    description: 'หากต้องการใช้บริการ กรุณาจองคิวใหม่',
  },
  no_show: {
    title: 'ไม่ได้มาตามนัด',
    description: 'หากต้องการใช้บริการ กรุณาจองคิวใหม่',
  },
}

export function BookingStatusNotice({ status }: { status: Booking['status'] }) {
  const copy = bookingStatusCopy[status]

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.default', p: 2 }}>
      <Typography sx={{ fontWeight: 950, fontSize: '1.12rem' }}>{copy.title}</Typography>
      <Typography sx={{ mt: 0.4, color: 'text.secondary', fontWeight: 700 }}>{copy.description}</Typography>
    </Box>
  )
}
