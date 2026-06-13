import type { ReactNode } from 'react'
import { Box, Button, Drawer, Stack, Tooltip } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DashboardIcon from '@mui/icons-material/Dashboard'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import { BrandMark } from '../../../components/BrandMark'
import type { RealtimeStatus } from '../../../hooks/useAdminRealtime'
import { overlay } from '../../../theme/theme'
import type { AdminPage } from '../constants/dashboardOptions'
import { AdminProfilePanel } from './AdminProfilePanel'

type NavProps = {
  activePage: AdminPage
  adminEmail: string
  adminName: string
  hasPendingAppUpdate: boolean
  latestRealtimeAt: Date | null
  realtimeStatus: RealtimeStatus
  setupTodoCount: number
  simpleMode: boolean
  unreadCount: number
  onApplyAppUpdate: () => void
  onChangePage: (page: AdminPage) => void
  onLogout: () => void
}

export function Sidebar(props: NavProps) {
  return (
    <Box component="aside" sx={{ display: { xs: 'none', lg: 'block' }, width: 280, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 10, maxHeight: '100vh' }}>
      <SidebarContent {...props} compact={false} />
    </Box>
  )
}

export function MobileNavDrawer({ open, onClose, ...props }: NavProps & { open: boolean; onClose: () => void }) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      transitionDuration={{ enter: 420, exit: 340 }}
      sx={{
        display: { xs: 'block', lg: 'none' },
        '& .MuiBackdrop-root': { bgcolor: overlay.backgroundColor, backdropFilter: overlay.backdropFilter, WebkitBackdropFilter: overlay.backdropFilter, transition: overlay.transition },
        '& .MuiDrawer-paper': { width: { xs: 'min(84vw, 320px)', sm: 340 }, bgcolor: 'background.paper', backgroundImage: 'none', borderRight: '1px solid', borderColor: 'divider', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      }}
    >
      <SidebarContent {...props} compact={false} headerAction={<Button aria-label="ปิดเมนู" variant="outlined" onClick={onClose} sx={{ minHeight: 40, px: 1.8 }}>ปิด</Button>} />
    </Drawer>
  )
}

function SidebarContent({ activePage, adminEmail, adminName, compact, hasPendingAppUpdate, headerAction, latestRealtimeAt, realtimeStatus, setupTodoCount, simpleMode, unreadCount, onApplyAppUpdate, onChangePage, onLogout }: NavProps & { compact: boolean; headerAction?: ReactNode }) {
  const visibleNavItems = navItems.filter((item) => !(simpleMode && item.hiddenInSimpleMode))
  return (
    <Stack sx={{ minHeight: '100%', p: 2.5, overflowY: 'auto' }} spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: compact ? 'center' : 'flex-start', '& p': { display: compact ? 'none' : 'block' } }}>
          <BrandMark />
        </Box>
        {headerAction}
      </Stack>
      <Stack spacing={1}>
        {visibleNavItems.map((item) => (
          <NavButton key={item.page} activePage={activePage} compact={compact} item={item} setupTodoCount={setupTodoCount} unreadCount={unreadCount} onChangePage={onChangePage} />
        ))}
      </Stack>
      <Box sx={{ flex: 1 }} />
      <AdminProfilePanel adminEmail={adminEmail} adminName={adminName} hasPendingAppUpdate={hasPendingAppUpdate} latestRealtimeAt={latestRealtimeAt} onApplyAppUpdate={onApplyAppUpdate} onLogout={onLogout} realtimeStatus={realtimeStatus} />
    </Stack>
  )
}

function NavButton({ activePage, compact, item, setupTodoCount, unreadCount, onChangePage }: { activePage: AdminPage; compact: boolean; item: NavItem; setupTodoCount: number; unreadCount: number; onChangePage: (page: AdminPage) => void }) {
  const isActive = activePage === item.page
  const badgeCount = item.page === 'notifications' ? unreadCount : item.page === 'setup' ? setupTodoCount : 0
  return (
    <Tooltip title={compact ? item.label : ''} placement="right">
      <Button fullWidth variant={isActive ? 'contained' : 'outlined'} startIcon={item.icon} aria-label={item.label} onClick={() => onChangePage(item.page)} sx={{ position: 'relative', justifyContent: compact ? 'center' : 'flex-start', minHeight: compact ? 50 : 58, minWidth: 0, pl: compact ? 0 : 2.5, pr: compact ? 0 : badgeCount > 0 ? 5 : 2.5, fontSize: '1rem', fontWeight: 900, bgcolor: isActive ? 'primary.main' : 'background.default', '& .MuiButton-startIcon': { mr: compact ? 0 : 1.25, ml: 0, '& svg': { fontSize: 23 } } }}>
        {badgeCount > 0 && <Badge page={item.page} setupTodoCount={setupTodoCount} unreadCount={unreadCount} />}
        <Box component="span" sx={{ display: compact ? 'none' : 'inline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</Box>
      </Button>
    </Tooltip>
  )
}

function Badge({ page, setupTodoCount, unreadCount }: { page: AdminPage; setupTodoCount: number; unreadCount: number }) {
  const badgeCount = page === 'notifications' ? unreadCount : setupTodoCount
  return (
    <Box component="span" aria-label={page === 'notifications' ? `${unreadCount} รายการแจ้งเตือนที่ยังไม่อ่าน` : `เหลือ ${setupTodoCount} ขั้นตอนเริ่มใช้งาน`} sx={{ position: 'absolute', top: 7, right: 8, minWidth: 22, height: 22, px: 0.6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, bgcolor: 'secondary.main', color: 'secondary.contrastText', border: '1px solid', borderColor: 'background.paper', fontSize: '0.72rem', fontWeight: 950, lineHeight: 1 }}>
      {badgeCount > 99 ? '99+' : badgeCount}
    </Box>
  )
}

type NavItem = { page: AdminPage; label: string; icon: ReactNode; hiddenInSimpleMode?: boolean }
const navItems: NavItem[] = [
  { page: 'setup', label: 'เริ่มใช้งาน', icon: <CheckCircleIcon /> },
  { page: 'overview', label: 'ภาพรวมของร้าน', icon: <DashboardIcon /> },
  { page: 'bookings', label: 'รายการจอง', icon: <CalendarMonthIcon /> },
  { page: 'services', label: 'บริการของร้าน', icon: <MiscellaneousServicesIcon /> },
  { page: 'notifications', label: 'รายการแจ้งเตือน', icon: <NotificationsIcon />, hiddenInSimpleMode: true },
  { page: 'settings', label: 'การตั้งค่าร้าน', icon: <SettingsIcon /> },
]
