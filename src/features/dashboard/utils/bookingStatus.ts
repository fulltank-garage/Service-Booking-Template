import type { BookingStatus } from '../../../types/admin'

export const statusLabels: Record<BookingStatus, string> = {
  pending: 'รอจัดการ',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  no_show: 'ไม่มาตามนัด',
}

export const statusChipSx = {
  color: '#FFFFFF',
  '& .MuiChip-label': {
    color: '#FFFFFF',
  },
}

export const statusChipTextSx = (status: BookingStatus) =>
  status === 'completed' || status === 'no_show'
    ? {
        color: '#111827',
        '& .MuiChip-label': {
          color: '#111827',
        },
      }
    : statusChipSx

export const getBookingStatusAction = (status: BookingStatus) => {
  if (status === 'pending') {
    return { label: 'รับคิวนี้', nextStatus: 'confirmed' as BookingStatus, disabled: false }
  }
  if (status === 'confirmed') {
    return { label: 'บันทึกว่าเสร็จแล้ว', nextStatus: 'completed' as BookingStatus, disabled: false }
  }
  return { label: status === 'completed' ? 'บันทึกว่าเสร็จแล้ว' : 'รับคิวนี้', nextStatus: status, disabled: true }
}

export const getBookingStatusConfirmation = (status: BookingStatus) => {
  if (status === 'confirmed') {
    return {
      title: 'ยืนยันรับคิวนี้?',
      description: 'เมื่อตกลงแล้วคิวนี้จะเปลี่ยนเป็นยืนยันแล้ว และลูกค้าจะเห็นว่าร้านรับคิวนี้แล้ว',
      confirmLabel: 'ยืนยันรับคิว',
      danger: false,
    }
  }
  if (status === 'completed') {
    return {
      title: 'ทำคิวนี้เสร็จแล้ว?',
      description: 'หลังบันทึกเสร็จสิ้น คิวนี้จะปิดงานและไม่ควรแก้ไขต่อ',
      confirmLabel: 'บันทึกเสร็จสิ้น',
      danger: false,
    }
  }
  if (status === 'no_show') {
    return {
      title: 'ลูกค้าไม่มาตามนัด?',
      description: 'ใช้เมื่อเลยเวลานัดแล้วลูกค้าไม่มา ระบบจะแยกออกจากคิวยกเลิกและคิวเสร็จสิ้น',
      confirmLabel: 'บันทึกไม่มาตามนัด',
      danger: true,
    }
  }
  return {
    title: 'ยืนยันการเปลี่ยนสถานะ?',
    description: 'ตรวจสอบให้แน่ใจก่อนบันทึกการเปลี่ยนสถานะคิวนี้',
    confirmLabel: 'ยืนยัน',
    danger: false,
  }
}

export const isClosedBookingStatus = (status: BookingStatus) =>
  status === 'completed' || status === 'cancelled' || status === 'no_show'
