import { Button, FormControl, Grid, MenuItem, Select, Stack, TextField } from '@mui/material'
import type { Booking, ServiceItem } from '../../../types/admin'
import { shopTimeOptions } from '../constants/dashboardOptions'
import { BottomEditorSheet } from './BottomEditorSheet'

export function BookingEditSheet({
  editDate,
  editNotes,
  editServiceId,
  editSlotTime,
  editingBooking,
  isSaving,
  onClose,
  onEditDateChange,
  onEditNotesChange,
  onEditServiceIdChange,
  onEditSlotTimeChange,
  onSave,
  services,
}: {
  editDate: string
  editNotes: string
  editServiceId: string
  editSlotTime: string
  editingBooking: Booking | null
  isSaving: boolean
  onClose: () => void
  onEditDateChange: (value: string) => void
  onEditNotesChange: (value: string) => void
  onEditServiceIdChange: (value: string) => void
  onEditSlotTimeChange: (value: string) => void
  onSave: () => void
  services: ServiceItem[]
}) {
  return (
    <BottomEditorSheet isOpen={Boolean(editingBooking)} onClose={onClose} title="แก้ไขรายการจอง">
      <Stack spacing={2}>
        <FormControl fullWidth>
          <Select aria-label="บริการ" value={editServiceId} onChange={(event) => onEditServiceIdChange(event.target.value)}>
            {services.map((service) => (
              <MenuItem key={service.id} value={service.id}>
                {service.nameTh}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth disabled label="ชื่อผู้จอง" value={editingBooking?.customerName ?? ''} slotProps={{ input: { readOnly: true } }} />
        <TextField fullWidth disabled label="เบอร์โทร" value={editingBooking?.phone ?? ''} slotProps={{ input: { readOnly: true }, htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="วันที่" type="date" value={editDate} onChange={(event) => onEditDateChange(event.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <Select aria-label="เวลา" value={editSlotTime} onChange={(event) => onEditSlotTimeChange(event.target.value)} displayEmpty>
                <MenuItem value="" disabled>
                  เลือกเวลา
                </MenuItem>
                {shopTimeOptions.map((option) => (
                  <MenuItem key={`edit-time-${option.value}`} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <TextField fullWidth multiline minRows={3} label="หมายเหตุ" value={editNotes} onChange={(event) => onEditNotesChange(event.target.value)} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" disabled={!editServiceId || !editDate || !editSlotTime || isSaving} onClick={onSave}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </Stack>
      </Stack>
    </BottomEditorSheet>
  )
}
