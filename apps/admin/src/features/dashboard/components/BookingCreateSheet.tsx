import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import type { BookingPayload } from '../../../api/adminApi'
import type { BookingSettings, ServiceItem } from '../../../types/admin'
import { useBookingCreateSheet } from '../hooks/useBookingCreateSheet'
import { BottomEditorSheet } from './BottomEditorSheet'
import { BookingCreateIntro, BookingDateTimeFields, CustomerFields, ServiceSelect } from './BookingCreateFields'

export function BookingCreateSheet({
  bookingSettings,
  bookingDate,
  isOpen,
  onBookingDateChange,
  onClose,
  onCreate,
  onServiceIdChange,
  selectedDate,
  serviceId,
  services,
}: {
  bookingSettings: BookingSettings | null
  bookingDate: string
  isOpen: boolean
  onBookingDateChange: (value: string) => void
  onClose: () => void
  onCreate: (payload: Omit<BookingPayload, 'status'>) => Promise<void>
  onServiceIdChange: (value: string) => void
  selectedDate: string
  serviceId: string
  services: ServiceItem[]
}) {
  const form = useBookingCreateSheet({
    bookingDate,
    bookingSettings,
    isOpen,
    onBookingDateChange,
    onCreate,
    onServiceIdChange,
    selectedDate,
    serviceId,
    services,
  })
  const isCreateDisabled =
    !serviceId ||
    !form.phone.trim() ||
    !bookingDate ||
    Boolean(form.bookingDateBlockReason) ||
    !form.slotTime ||
    form.isSaving

  return (
    <BottomEditorSheet isOpen={isOpen} onClose={onClose} title="เพิ่มคิวโทร/หน้าร้าน">
      <Stack spacing={2}>
        <BookingCreateIntro />
        <Typography variant="h3">ข้อมูลจำเป็น</Typography>
        <ServiceSelect serviceId={serviceId} services={services} onChange={onServiceIdChange} />
        <CustomerFields customerName={form.customerName} phone={form.phone} onCustomerNameChange={form.setCustomerName} onPhoneChange={form.setPhone} />
        <BookingDateTimeFields
          bookingDate={bookingDate}
          bookingDateBlockReason={form.bookingDateBlockReason}
          isLoadingSlots={form.isLoadingSlots}
          maxBookingDate={form.maxBookingDate}
          serviceId={serviceId}
          slotError={form.slotError}
          slots={form.slots}
          slotTime={form.slotTime}
          onBookingDateChange={form.handleBookingDateChange}
          onSlotTimeChange={form.setSlotTime}
        />
        <Box>
          <Typography variant="h3" sx={{ mb: 1 }}>
            รายละเอียดเพิ่มเติม (ไม่บังคับ)
          </Typography>
          <TextField fullWidth multiline minRows={3} label="หมายเหตุ" value={form.notes} onChange={(event) => form.setNotes(event.target.value)} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="outlined" disabled={form.isSaving} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="contained" disabled={isCreateDisabled} onClick={form.handleCreate}>
            {form.isSaving ? 'กำลังบันทึก...' : 'บันทึกคิว'}
          </Button>
        </Stack>
      </Stack>
    </BottomEditorSheet>
  )
}
