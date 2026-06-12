import { Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, TextField, Typography } from '@mui/material'
import type { ServiceItem } from '../../../types/admin'
import { digitsOnly, formatThaiPrice } from '../utils/formatters'
import { BottomEditorSheet } from './BottomEditorSheet'

type ServiceEditorSheetProps = {
  canAdd: boolean
  descriptionTh: string
  durationMinutes: string
  editingService: ServiceItem | null
  isOpen: boolean
  isSaving: boolean
  nameTh: string
  onClose: () => void
  onSave: () => void
  priceBaht: string
  setDescriptionTh: (value: string) => void
  setDurationMinutes: (value: string) => void
  setNameTh: (value: string) => void
  setPriceBaht: (value: string) => void
}

export function ServiceEditorSheet(props: ServiceEditorSheetProps) {
  const previewName = props.nameTh.trim() || 'ตัวอย่างบริการ'
  const previewDescription = props.descriptionTh.trim() || 'รายละเอียดบริการจะแสดงให้ลูกค้าเห็นตรงนี้'
  const previewDuration = Number(props.durationMinutes) > 0 ? `${Number(props.durationMinutes)} นาที` : 'เวลาที่ใช้'
  const previewPrice = Number(props.priceBaht) >= 0 ? formatThaiPrice(Math.round(Number(props.priceBaht) * 100)) : 'ราคา'
  return (
    <BottomEditorSheet isOpen={props.isOpen} onClose={props.onClose} title={props.editingService ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); props.onSave() }}>
        <Stack spacing={2}>
          <TextField fullWidth label="ชื่อบริการ" value={props.nameTh} onChange={(event) => props.setNameTh(event.target.value)} />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="ราคา" value={props.priceBaht} onChange={(event) => props.setPriceBaht(digitsOnly(event.target.value))} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="เวลาที่ใช้ (นาที)" value={props.durationMinutes} onChange={(event) => props.setDurationMinutes(digitsOnly(event.target.value))} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
            </Grid>
          </Grid>
          <TextField fullWidth multiline minRows={3} label="รายละเอียดบริการ" value={props.descriptionTh} onChange={(event) => props.setDescriptionTh(event.target.value)} />
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.5, bgcolor: 'background.default' }}>
            <Typography sx={{ mb: 1, fontSize: '0.86rem', fontWeight: 900, color: 'text.primary' }}>ตัวอย่างที่แสดงในหน้าลูกค้า</Typography>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1.3}><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: '1.18rem', fontWeight: 950, lineHeight: 1.2 }}>{previewName}</Typography><Typography sx={{ mt: 0.45, color: 'text.secondary', lineHeight: 1.5 }}>{previewDescription}</Typography></Box><Divider /><Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Chip color="secondary" label={previewDuration} /><Typography sx={{ color: 'primary.main', fontWeight: 950 }}>{previewPrice}</Typography></Stack></Stack>
              </CardContent>
            </Card>
          </Box>
          <Stack direction="row" spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" disabled={props.isSaving} onClick={props.onClose}>ยกเลิก</Button>
            <Button variant="contained" type="submit" disabled={!props.canAdd || props.isSaving}>{props.isSaving ? 'กำลังบันทึก...' : props.editingService ? 'บันทึกการแก้ไข' : 'บันทึกบริการ'}</Button>
          </Stack>
        </Stack>
      </Box>
    </BottomEditorSheet>
  )
}
