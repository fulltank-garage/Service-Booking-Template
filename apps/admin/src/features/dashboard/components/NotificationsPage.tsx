import { useState } from 'react'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import type { AdminNotification, PushHealthReport } from '../../../types/admin'
import { formatNotificationTimestamp, formatShopNotificationBody, formatShopNotificationTitle } from '../utils/formatters'
import { PushHealthCard } from './PushHealthCard'

type NotificationsPageProps = {
  notifications: AdminNotification[]
  onError: () => void
  onMarkAllRead: () => Promise<void>
  onMarkRead: (notificationId: string) => Promise<void>
  pushHealth: PushHealthReport | null
  simpleMode: boolean
}

export function NotificationsPage({ notifications, onError, onMarkAllRead, onMarkRead, pushHealth, simpleMode }: NotificationsPageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingId, setMarkingId] = useState('')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const unreadCount = notifications.filter((notification) => !notification.isRead).length
  const visibleNotifications = filter === 'unread' ? notifications.filter((notification) => !notification.isRead) : notifications

  const handleMarkRead = async (notificationId: string) => {
    if (markingId) return
    setMarkingId(notificationId)
    try {
      await onMarkRead(notificationId)
    } catch {
      onError()
    } finally {
      setMarkingId('')
    }
  }

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return
    setIsMarkingAll(true)
    try {
      await onMarkAllRead()
    } catch {
      onError()
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <Stack spacing={2}>
      {!simpleMode && pushHealth && <PushHealthCard health={pushHealth} />}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <NotificationToolbar filter={filter} unreadCount={unreadCount} isMarkingAll={isMarkingAll} onFilterChange={setFilter} onMarkAllRead={handleMarkAllRead} />
            {visibleNotifications.length === 0 ? (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', py: 5, px: 2, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 900 }}>{filter === 'unread' ? 'ไม่มีแจ้งเตือนที่ยังไม่อ่าน' : 'ยังไม่มีรายการแจ้งเตือน'}</Typography>
              </Box>
            ) : (
              <Stack spacing={1.2}>
                {visibleNotifications.map((notification) => (
                  <NotificationItem key={notification.id} markingId={markingId} notification={notification} onMarkRead={handleMarkRead} />
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

function NotificationToolbar({ filter, isMarkingAll, onFilterChange, onMarkAllRead, unreadCount }: { filter: 'all' | 'unread'; isMarkingAll: boolean; onFilterChange: (filter: 'all' | 'unread') => void; onMarkAllRead: () => void; unreadCount: number }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
      <Typography variant="h2">รายการแจ้งเตือน</Typography>
      <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={0.8}>
          <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => onFilterChange('all')}>ทั้งหมด</Button>
          <Button variant={filter === 'unread' ? 'contained' : 'outlined'} onClick={() => onFilterChange('unread')}>ยังไม่อ่าน</Button>
        </Stack>
        <Button variant="outlined" disabled={isMarkingAll || unreadCount === 0} onClick={onMarkAllRead}>{isMarkingAll ? 'กำลังอ่าน...' : 'อ่านทั้งหมด'}</Button>
      </Stack>
    </Stack>
  )
}

function NotificationItem({ markingId, notification, onMarkRead }: { markingId: string; notification: AdminNotification; onMarkRead: (notificationId: string) => void }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: notification.isRead ? 'divider' : 'primary.main', borderRadius: 2.5, bgcolor: 'background.default', p: 1.6 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 950 }}>{formatShopNotificationTitle(notification)}</Typography>
          <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>{formatShopNotificationBody(notification.body)}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>{formatNotificationTimestamp(notification.createdAt)}</Typography>
        </Box>
        {!notification.isRead && <Button variant="contained" disabled={markingId === notification.id} onClick={() => onMarkRead(notification.id)}>อ่านแล้ว</Button>}
      </Stack>
    </Box>
  )
}
