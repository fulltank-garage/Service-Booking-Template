import { Grid, TextField } from '@mui/material'
import { digitsOnly } from '../utils/bookingWizardInput'

type ContactDetailsFormProps = {
  customerName: string
  hasLineDisplayName: boolean
  notes: string
  phone: string
  onManualCustomerNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onPhoneChange: (value: string) => void
}

export function ContactDetailsForm({
  customerName,
  hasLineDisplayName,
  notes,
  phone,
  onManualCustomerNameChange,
  onNotesChange,
  onPhoneChange,
}: ContactDetailsFormProps) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={hasLineDisplayName ? 'ชื่อจาก LINE' : 'ชื่อผู้จอง'}
          value={customerName}
          disabled={hasLineDisplayName}
          onChange={(event) => onManualCustomerNameChange(event.target.value)}
          slotProps={{ input: { readOnly: hasLineDisplayName } }}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="เบอร์โทร"
          value={phone}
          onChange={(event) => onPhoneChange(digitsOnly(event.target.value))}
          slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="หมายเหตุ (ไม่บังคับ)"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="รายละเอียดเพิ่มเติม เช่น ลายที่อยากทำหรือเวลาที่สะดวก"
        />
      </Grid>
    </Grid>
  )
}
