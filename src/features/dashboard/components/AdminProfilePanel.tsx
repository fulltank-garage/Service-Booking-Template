import { Box, Button, Stack, Typography } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import WifiTetheringIcon from '@mui/icons-material/WifiTethering'
import type { RealtimeStatus } from '../../../hooks/useAdminRealtime'

type AdminProfilePanelProps = {
  adminEmail: string
  adminName: string
  hasPendingAppUpdate: boolean
  latestRealtimeAt: Date | null
  onApplyAppUpdate: () => void
  onLogout: () => void
  realtimeStatus: RealtimeStatus
}

export function AdminProfilePanel(props: AdminProfilePanelProps) {
  const statusLabel: Record<RealtimeStatus, string> = {
    connected: 'เชื่อมต่อข้อมูลล่าสุด',
    connecting: 'กำลังเชื่อมต่อ',
    reconnecting: 'กำลังเชื่อมต่อใหม่',
    off: 'ปิดข้อมูลสด',
  }
  const statusColor = props.realtimeStatus === 'off' ? 'text.secondary' : 'primary.main'
  const latestLabel = props.latestRealtimeAt
    ? new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(props.latestRealtimeAt)
    : 'ยังไม่มีข้อมูลอัปเดต'

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', color: 'text.primary', p: 2 }}>
      <Stack spacing={1.6}>
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 950, lineHeight: 1.2 }}>{props.adminName}</Typography>
          <Typography sx={{ mt: 0.45, color: 'text.secondary', fontSize: '0.84rem', fontWeight: 800, wordBreak: 'break-word' }}>
            {props.adminEmail}
          </Typography>
        </Box>
        <ProfileInfoCard
          icon={<WifiTetheringIcon sx={{ color: statusColor, fontSize: 30 }} />}
          title={statusLabel[props.realtimeStatus]}
          description={`ข้อมูลล่าสุด ${latestLabel}`}
        />
        <Box
          sx={{
            border: '1px solid',
            borderColor: props.hasPendingAppUpdate ? 'primary.main' : 'divider',
            borderRadius: 2.5,
            p: 1.4,
            bgcolor: props.hasPendingAppUpdate ? '#F3F4F6' : 'background.default',
          }}
        >
          <ProfileInfoCard
            icon={<SystemUpdateAltIcon className={props.hasPendingAppUpdate ? 'app-update-pulse' : undefined} sx={{ color: props.hasPendingAppUpdate ? 'primary.main' : 'text.secondary', fontSize: 30 }} />}
            title="อัปเดตแอป"
            description={props.hasPendingAppUpdate ? 'มีเวอร์ชันใหม่พร้อมใช้งาน' : 'กำลังใช้เวอร์ชันล่าสุด'}
            unframed
          />
          {props.hasPendingAppUpdate && (
            <Button fullWidth variant="contained" onClick={props.onApplyAppUpdate} sx={{ mt: 1.4 }}>
              อัพเดตเลย
            </Button>
          )}
        </Box>
        <Button fullWidth onClick={props.onLogout} startIcon={<LogoutIcon />} variant="outlined" sx={{ borderColor: '#DC2626', color: '#FFFFFF', bgcolor: '#DC2626', '&:hover': { borderColor: '#B91C1C', bgcolor: '#B91C1C' } }}>
          ออกจากระบบ
        </Button>
      </Stack>
    </Box>
  )
}

function ProfileInfoCard({ description, icon, title, unframed }: { description: string; icon: React.ReactNode; title: string; unframed?: boolean }) {
  return (
    <Box sx={unframed ? undefined : { border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4, bgcolor: 'background.default' }}>
      <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.88rem', fontWeight: 950, color: 'text.primary', lineHeight: 1.25 }}>{title}</Typography>
          <Typography sx={{ mt: 0.35, color: 'text.secondary', fontSize: '0.66rem', fontWeight: 800, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
