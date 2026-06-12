import { useState } from 'react'
import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import type { PushHealthReport } from '../../../types/admin'
import { statusChipSx } from '../utils/bookingStatus'

export function PushHealthCard({ health }: { health: PushHealthReport }) {
  const [showDetails, setShowDetails] = useState(false)
  const isReady = health.recommendation === 'push_ready'
  const diagnosticSteps = [
    { label: '1 เปิดจาก Home Screen', value: health.subscriptionCount > 0 ? 'พบเครื่องที่เปิดแจ้งเตือนแล้ว' : 'ติดตั้งและเปิดแอปจาก Home Screen ก่อน', ready: health.subscriptionCount > 0 },
    { label: '2 อนุญาตแจ้งเตือน', value: health.subscriptionCount > 0 ? 'มีสิทธิ์รับแจ้งเตือนแล้ว' : 'กดเปิดแจ้งเตือนและอนุญาตใน Settings', ready: health.subscriptionCount > 0 },
    { label: '3 เซิร์ฟเวอร์พร้อมส่ง', value: health.senderReady ? 'พร้อมส่งแจ้งเตือนไปที่เครื่องนี้' : 'ให้ผู้ดูแลตรวจสอบคีย์แจ้งเตือน', ready: health.senderReady },
  ]

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h2">สถานะแจ้งเตือน Admin</Typography>
            <Chip color={isReady ? 'success' : 'primary'} label={recommendationLabels[health.recommendation] ?? health.recommendation} sx={isReady ? undefined : statusChipSx} />
          </Stack>
          <Grid container spacing={1}>
            {[
              ['การตั้งค่าระบบ', health.validKeys ? 'พร้อม' : health.configured ? 'ต้องให้ผู้ดูแลตรวจสอบ' : 'ยังไม่ตั้งค่า'],
              ['การส่งแจ้งเตือน', health.senderReady ? 'พร้อมส่ง' : 'ยังไม่พร้อมส่ง'],
              ['เครื่องที่เปิดแจ้งเตือน', `${health.subscriptionCount} เครื่อง`],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 12, sm: 4 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.4 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 950 }}>{value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
            <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>
              {recommendationMessages[health.recommendation] ?? 'ตรวจสอบสถานะแจ้งเตือนก่อนใช้งานจริง'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'stretch' }}>
              <Button variant="contained" onClick={() => setShowDetails(true)}>ตรวจแจ้งเตือนเครื่องนี้</Button>
              <Button variant="outlined" onClick={() => setShowDetails((current) => !current)}>{showDetails ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียดผู้ดูแล'}</Button>
            </Stack>
          </Stack>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem', fontWeight: 760 }}>
            ถ้าใช้ iPhone หรือ iPad ต้องเปิดจาก Home Screen และอนุญาตแจ้งเตือนใน Settings ของแอปนี้
          </Typography>
          <Grid container spacing={1}>
            {diagnosticSteps.map((step) => (
              <Grid key={step.label} size={{ xs: 12, md: 4 }}>
                <Box sx={{ border: '1px solid', borderColor: step.ready ? '#16A34A' : 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.4 }}>
                  <Typography sx={{ color: step.ready ? '#15803D' : 'text.primary', fontWeight: 950 }}>{step.label}</Typography>
                  <Typography sx={{ mt: 0.35, color: 'text.secondary', fontSize: '0.86rem', fontWeight: 760 }}>{step.value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {showDetails && (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.4 }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 760, wordBreak: 'break-word' }}>
                ข้อมูลสำหรับผู้ดูแล: {health.recommendation}{health.lastError ? ` · ${health.lastError}` : ''}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

const recommendationLabels: Record<string, string> = {
  push_ready: 'แจ้งเตือนโทรศัพท์พร้อมใช้งาน',
  vapid_not_configured: 'ยังไม่ได้ตั้งค่าระบบแจ้งเตือน',
  vapid_key_mismatch: 'การตั้งค่าแจ้งเตือนไม่ตรงกัน',
  push_sender_not_ready: 'ระบบส่งแจ้งเตือนยังไม่พร้อม',
  no_subscription: 'ยังไม่มีเครื่องที่เปิดแจ้งเตือน',
}

const recommendationMessages: Record<string, string> = {
  push_ready: 'เครื่องนี้พร้อมรับแจ้งเตือนเมื่อมีคิวใหม่แล้ว',
  vapid_not_configured: 'ต้องให้ผู้ดูแลระบบตั้งค่าคีย์แจ้งเตือนบนเซิร์ฟเวอร์ก่อน',
  vapid_key_mismatch: 'คีย์แจ้งเตือนของเครื่องนี้ไม่ตรงกับเซิร์ฟเวอร์ ให้เปิดแจ้งเตือนใหม่อีกครั้ง',
  push_sender_not_ready: 'เซิร์ฟเวอร์ยังส่งแจ้งเตือนไม่ได้ ให้ผู้ดูแลตรวจสอบการตั้งค่า',
  no_subscription: 'ยังไม่มีเครื่องที่กดเปิดแจ้งเตือน ให้เปิดจากปุ่มด้านบนของหน้า',
}
