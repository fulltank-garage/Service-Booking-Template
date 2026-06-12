import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import type { PushHealthReport } from '../../../types/admin'
import type { AdminPage } from '../constants/dashboardOptions'
import { statusChipSx } from '../utils/bookingStatus'

type SetupChecklistPageProps = {
  onCompleteDemoBooking: () => void
  onChangePage: (page: AdminPage) => void
  progress: { items: Array<{ label: string; done: boolean }>; doneCount: number; total: number }
  pushHealth: PushHealthReport | null
}

export function SetupChecklistPage({ onCompleteDemoBooking, onChangePage, progress, pushHealth }: SetupChecklistPageProps) {
  const steps = buildSetupSteps(progress, pushHealth)

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h2">เริ่มใช้งานร้าน</Typography>
              <Typography sx={{ mt: 0.75, color: 'text.secondary', fontWeight: 760 }}>
                ทำตามขั้นตอนสั้น ๆ เพื่อให้ร้านเริ่มรับคิวได้โดยไม่ต้องตั้งค่าทุกอย่างตั้งแต่แรก
              </Typography>
            </Box>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.4, minWidth: { md: 180 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>ความพร้อมใช้งาน</Typography>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 950, lineHeight: 1.1 }}>{progress.doneCount}/{progress.total}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={1.2}>
            {steps.map((step) => (
              <Box key={step.label} sx={{ border: '1px solid', borderColor: step.done ? 'primary.main' : 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip label={step.done ? 'เสร็จแล้ว' : 'ยังต้องทำ'} color={step.done ? 'success' : 'primary'} sx={step.done ? undefined : statusChipSx} />
                      <Typography sx={{ fontWeight: 950 }}>{step.label}</Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.7, color: 'text.secondary', fontWeight: 760 }}>{step.description}</Typography>
                  </Box>
                  <Button variant={step.done ? 'outlined' : 'contained'} onClick={() => handleStepAction(step, onCompleteDemoBooking, onChangePage)}>
                    {step.actionLabel}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export function QuickStartNudge({ onCompleteDemoBooking, onChangePage, progress }: Omit<SetupChecklistPageProps, 'pushHealth'>) {
  const nextStep = progress.items.find((item) => !item.done)
  const nextPage: AdminPage =
    nextStep?.label === 'เพิ่มบริการแรก' ? 'services' :
    nextStep?.label === 'ตั้งเวลาเปิดปิดร้าน' ? 'settings' :
    nextStep?.label === 'เปิดแจ้งเตือนโทรศัพท์' ? 'notifications' :
    'setup'

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.4} sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 950 }}>เริ่มรับคิวให้พร้อมก่อนใช้งานจริง</Typography>
            <Typography sx={{ mt: 0.4, color: 'text.secondary', fontWeight: 760 }}>
              เหลือ {progress.total - progress.doneCount} ขั้นตอน: {nextStep?.label ?? 'ตรวจสอบความพร้อมของร้าน'}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" onClick={() => onChangePage('setup')}>ดูขั้นตอนทั้งหมด</Button>
            <Button variant="contained" onClick={() => nextStep?.label === 'ทดลองสร้างคิว' ? onCompleteDemoBooking() : onChangePage(nextPage)}>
              {nextStep?.label === 'ทดลองสร้างคิว' ? 'บันทึกว่าลองแล้ว' : 'ทำขั้นตอนถัดไป'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

type SetupStep = { label: string; description: string; done: boolean; actionLabel: string; page: AdminPage }
const isDone = (progress: SetupChecklistPageProps['progress'], label: string) => progress.items.find((item) => item.label === label)?.done ?? false
const handleStepAction = (step: SetupStep, onCompleteDemoBooking: () => void, onChangePage: (page: AdminPage) => void) => {
  if (step.label === 'ทดลองสร้างคิว' && !step.done) onCompleteDemoBooking()
  else onChangePage(step.page)
}

function buildSetupSteps(progress: SetupChecklistPageProps['progress'], pushHealth: PushHealthReport | null): SetupStep[] {
  return [
    { label: 'เพิ่มบริการแรก', description: 'ใส่ชื่อบริการ ราคา และเวลาที่ใช้ เพื่อให้ลูกค้าเลือกจองได้', done: isDone(progress, 'เพิ่มบริการแรก'), actionLabel: 'ไปเพิ่มบริการ', page: 'services' },
    { label: 'ตั้งเวลาเปิดปิดร้าน', description: 'กำหนดเวลาที่ร้านรับคิว วันปิดร้าน และเวลาพักระหว่างคิว', done: isDone(progress, 'ตั้งเวลาเปิดปิดร้าน'), actionLabel: 'ไปตั้งค่าร้าน', page: 'settings' },
    { label: 'ทดลองสร้างคิว', description: 'ลองดูขั้นตอนเพิ่มคิวแบบจำลอง เพื่อให้ทีมคุ้นกับหน้ารายการจองโดยไม่สร้างข้อมูลจริง', done: isDone(progress, 'ทดลองสร้างคิว'), actionLabel: 'บันทึกว่าลองแล้ว', page: 'bookings' },
    { label: 'เปิดแจ้งเตือนโทรศัพท์', description: pushHealth?.recommendation === 'push_ready' ? 'เครื่องนี้พร้อมรับแจ้งเตือนแล้ว' : 'เปิดแจ้งเตือนเพื่อให้ร้านรู้ทันทีเมื่อมีคิวใหม่', done: isDone(progress, 'เปิดแจ้งเตือนโทรศัพท์'), actionLabel: 'ไปดูแจ้งเตือน', page: 'notifications' },
  ]
}
