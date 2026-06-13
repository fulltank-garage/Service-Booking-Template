import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import type { Booking, BookingStatus } from '../../../types/admin'
import { getBookingStatusAction, getBookingStatusConfirmation, isClosedBookingStatus } from '../utils/bookingStatus'
import { BottomEditorSheet } from './BottomEditorSheet'

export function BookingActionButtons({
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
  const statusAction = getBookingStatusAction(booking.status)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const canUseSecondaryActions = !isClosedBookingStatus(booking.status)
  const pendingConfirmation = pendingStatus ? getBookingStatusConfirmation(pendingStatus) : null

  const openStatusConfirm = (status: BookingStatus) => {
    if (isClosedBookingStatus(booking.status)) return
    setPendingStatus(status)
  }

  const confirmStatusChange = () => {
    if (!pendingStatus) return
    const nextStatus = pendingStatus
    setPendingStatus(null)
    void onStatusChange(booking, nextStatus)
  }

  const confirmCancelBooking = () => {
    setIsCancelConfirmOpen(false)
    onDeleteBooking(booking)
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          '& .MuiButton-root': {
            minHeight: 48,
            px: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          disabled={!canUseSecondaryActions}
          onClick={() => setIsMoreOpen(true)}
        >
          เพิ่มเติม
        </Button>
        <Button
          fullWidth
          variant="contained"
          disabled={statusAction.disabled}
          onClick={() => openStatusConfirm(statusAction.nextStatus)}
        >
          {statusAction.label}
        </Button>
      </Stack>

      <BottomEditorSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} title="จัดการเพิ่มเติม">
        <Stack spacing={1.2}>
          <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
            ใช้เฉพาะกรณีที่ต้องแก้ไขหรือยกเลิกคิว เพื่อไม่ให้ปุ่มหลักรกเกินไป
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            disabled={!canUseSecondaryActions}
            onClick={() => {
              setIsMoreOpen(false)
              onEditBooking(booking)
            }}
          >
            แก้ไขคิว
          </Button>
          {!simpleMode && (
            <Button
              fullWidth
              variant="outlined"
            disabled={!canUseSecondaryActions}
            onClick={() => {
              setIsMoreOpen(false)
              openStatusConfirm('no_show')
            }}
          >
            ไม่มาตามนัด
            </Button>
          )}
          <Button
            fullWidth
            variant="contained"
            disabled={!canUseSecondaryActions}
            onClick={() => {
              setIsMoreOpen(false)
              setIsCancelConfirmOpen(true)
            }}
            sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
          >
            ยกเลิกคิว
          </Button>
        </Stack>
      </BottomEditorSheet>

      <BottomEditorSheet isOpen={Boolean(pendingConfirmation)} onClose={() => setPendingStatus(null)} title={pendingConfirmation?.title ?? ''}>
        {pendingConfirmation && (
          <Stack spacing={1.6}>
            <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
              {pendingConfirmation.description}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setPendingStatus(null)}>
                ปิด
              </Button>
              <Button
                variant="contained"
                onClick={confirmStatusChange}
                sx={
                  pendingConfirmation.danger
                    ? { bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }
                    : undefined
                }
              >
                {pendingConfirmation.confirmLabel}
              </Button>
            </Stack>
          </Stack>
        )}
      </BottomEditorSheet>

      <BottomEditorSheet isOpen={isCancelConfirmOpen} onClose={() => setIsCancelConfirmOpen(false)} title="ยืนยันยกเลิกคิว?">
        <Stack spacing={1.6}>
          <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
            ใช้เมื่อร้านต้องยกเลิกคิวนี้จริง ๆ หลังยกเลิกแล้วลูกค้าจะไม่ควรเห็นคิวนี้เป็นคิวที่กำลังใช้งาน
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => setIsCancelConfirmOpen(false)}>
              ปิด
            </Button>
            <Button
              variant="contained"
              onClick={confirmCancelBooking}
              sx={{ bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}
            >
              ยืนยันยกเลิกคิว
            </Button>
          </Stack>
        </Stack>
      </BottomEditorSheet>
    </>
  )
}
