import { Box, Button, FormControl, Grid, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import type { BookingSettings } from '../../../types/admin'
import { bufferMinuteOptions, reminderLeadOptions, shopTimeOptions } from '../constants/dashboardOptions'
import { digitsOnly } from '../utils/formatters'

export function SettingsSection({ children, title }: { children: React.ReactNode; title: string }) {
  return <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.5 }}><Typography variant="h3" sx={{ mb: 1.2 }}>{title}</Typography>{children}</Box>
}

export function PresetSection({ onApplyPreset }: { onApplyPreset: (preset: 'small' | 'medium' | 'large') => void }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.5 }}>
      <Typography variant="h3" sx={{ mb: 0.5 }}>ค่าแนะนำตามขนาดร้าน</Typography>
      <Typography sx={{ mb: 1.2, color: 'text.secondary', fontWeight: 760 }}>เลือกค่าเริ่มต้นได้ก่อน แล้วค่อยปรับตัวเลขให้ตรงกับหน้าร้านจริง</Typography>
      <Stack spacing={0.5} sx={{ mb: 1.2 }}>
        {['ร้านเล็ก = 1 ช่าง รับทีละ 1 คิว พัก 10 นาที', 'ร้านกลาง = 2 ช่าง รับพร้อมกัน 2 คิว พัก 15 นาที', 'ร้านใหญ่ = 4 ช่าง รับพร้อมกันหลายคิว และเตือนก่อนนัดเร็วขึ้น'].map((text) => <Typography key={text} sx={{ color: 'text.secondary', fontSize: '0.86rem', fontWeight: 760 }}>{text}</Typography>)}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" onClick={() => onApplyPreset('small')}>ใช้ค่าร้านเล็ก</Button><Button variant="outlined" onClick={() => onApplyPreset('medium')}>ใช้ค่าร้านกลาง</Button><Button variant="outlined" onClick={() => onApplyPreset('large')}>ใช้ค่าร้านใหญ่</Button></Stack>
    </Box>
  )
}

export function TimeSection({ closeTime, openTime, setCloseTime, setOpenTime }: { closeTime: string; openTime: string; setCloseTime: (value: string) => void; setOpenTime: (value: string) => void }) {
  return <SettingsSection title="เวลาร้าน"><Grid container spacing={1.5}>{[['เวลาเปิดร้าน', openTime, setOpenTime, 'open'], ['เวลาปิดร้าน', closeTime, setCloseTime, 'close']].map(([label, value, setter, key]) => <Grid size={{ xs: 12, sm: 6 }} key={String(key)}><FormControl fullWidth><Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>{String(label)}</Typography><Select aria-label={String(label)} value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)}>{shopTimeOptions.map((option) => <MenuItem key={`${key}-${option.value}`} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>)}</Grid></SettingsSection>
}

export function QueueSection(props: { bufferMinutes: string; maxAdvanceDays: string; minAdvanceHours: string; setBufferMinutes: (value: string) => void; setMaxAdvanceDays: (value: string) => void; setMinAdvanceHours: (value: string) => void; setSlotCapacity: (value: string) => void; slotCapacity: string }) {
  return (
    <SettingsSection title="จำนวนคิว">
      <Grid container spacing={1.5}>
        {[['รับลูกค้าพร้อมกันได้กี่คิว', props.slotCapacity, props.setSlotCapacity, 'เช่น มีช่าง 2 คน รับพร้อมกันได้ 2 คิว'], ['ต้องจองล่วงหน้าอย่างน้อยกี่ชั่วโมง', props.minAdvanceHours, props.setMinAdvanceHours, 'ใส่ 0 ถ้ารับจองเวลาที่ใกล้ที่สุดได้'], ['ลูกค้าจองล่วงหน้าได้ไกลสุดกี่วัน', props.maxAdvanceDays, props.setMaxAdvanceDays, 'เช่น 30 คือเปิดรับคิวล่วงหน้าได้ 30 วัน']].map(([label, value, setter, helper]) => <Grid size={{ xs: 12, sm: 6 }} key={String(label)}><TextField fullWidth label={String(label)} value={String(value)} onChange={(event) => (setter as (value: string) => void)(digitsOnly(event.target.value))} helperText={String(helper)} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} /></Grid>)}
        <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth><Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>เวลาพักระหว่างคิว</Typography><Select aria-label="เวลาพักระหว่างคิว" value={props.bufferMinutes} onChange={(event) => props.setBufferMinutes(event.target.value)}>{bufferMinuteOptions.map((option) => <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
      </Grid>
    </SettingsSection>
  )
}

export function ReminderSection({ reminderLeadMinutes, setReminderLeadMinutes }: { reminderLeadMinutes: string; setReminderLeadMinutes: (value: string) => void }) {
  return <SettingsSection title="แจ้งเตือน"><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth><Typography sx={{ mb: 0.8, fontSize: '0.85rem', fontWeight: 900 }}>เตือนลูกค้าก่อนนัด</Typography><Select aria-label="เตือนก่อนนัด" value={reminderLeadMinutes} onChange={(event) => setReminderLeadMinutes(event.target.value)}>{reminderLeadOptions.map((option) => <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>)}</Select></FormControl></Grid></Grid></SettingsSection>
}

export function HolidaySection({ blackoutDates, closedWeekdays, setBlackoutDates, setClosedWeekdays }: { blackoutDates: BookingSettings['blackoutDates']; closedWeekdays: string; setBlackoutDates: React.Dispatch<React.SetStateAction<BookingSettings['blackoutDates']>>; setClosedWeekdays: (value: string) => void }) {
  const weekdayOptions = [['0', 'วันอาทิตย์'], ['1', 'วันจันทร์'], ['2', 'วันอังคาร'], ['3', 'วันพุธ'], ['4', 'วันพฤหัสบดี'], ['5', 'วันศุกร์'], ['6', 'วันเสาร์']] as const
  const selectedDays = closedWeekdays.split(',').map((value) => value.trim()).filter(Boolean)
  const weekdayLabelMap = new Map<string, string>(weekdayOptions)
  return (
    <SettingsSection title="วันหยุด"><Stack spacing={2}><Box><Typography sx={{ mb: 1, fontSize: '0.9rem', fontWeight: 900 }}>วันปิดร้าน</Typography><Select fullWidth multiple displayEmpty value={selectedDays} onChange={(event) => { const value = event.target.value; const days = Array.isArray(value) ? value : value.split(','); setClosedWeekdays(days.map((day) => String(day)).sort().join(',')) }} renderValue={(selected) => { const days = selected as string[]; return days.length === 0 ? 'เลือกวันที่ร้านหยุด' : days.map((day) => weekdayLabelMap.get(day) ?? day).join(', ') }}>{weekdayOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></Box><Box><Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}><Typography sx={{ fontSize: '0.9rem', fontWeight: 900 }}>วันหยุดเฉพาะวันที่</Typography><Button variant="outlined" onClick={() => setBlackoutDates((current) => [...current, { date: '', reason: '' }])}>เพิ่มวันหยุด</Button></Stack><Stack spacing={1}>{blackoutDates.length === 0 && <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>ยังไม่มีวันหยุดเฉพาะวันที่</Typography>}{blackoutDates.map((item, index) => <Grid container spacing={1} key={`${item.id ?? 'new'}-${index}`}><Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="date" value={item.date} onChange={(event) => setBlackoutDates((current) => current.map((dateItem, itemIndex) => itemIndex === index ? { ...dateItem, date: event.target.value } : dateItem))} /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth placeholder="เหตุผล เช่น ร้านหยุดพิเศษ" value={item.reason ?? ''} onChange={(event) => setBlackoutDates((current) => current.map((dateItem, itemIndex) => itemIndex === index ? { ...dateItem, reason: event.target.value } : dateItem))} /></Grid><Grid size={{ xs: 12, sm: 2 }}><Button fullWidth variant="contained" onClick={() => setBlackoutDates((current) => current.filter((_, itemIndex) => itemIndex !== index))} sx={{ minHeight: 56, bgcolor: '#DC2626', color: '#FFFFFF', '&:hover': { bgcolor: '#B91C1C' } }}>ลบ</Button></Grid></Grid>)}</Stack></Box></Stack></SettingsSection>
  )
}
