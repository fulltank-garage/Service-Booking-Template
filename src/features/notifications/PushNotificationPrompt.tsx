import { useMemo, useState } from 'react'
import { Alert, Button, Stack, Typography } from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import {
  enablePushNotifications,
  getCurrentPushPermission,
  isPushNotificationSupported,
} from './pushNotifications'

type PushNotificationPromptProps = {
  onNotice: (message: string) => void
}

export function PushNotificationPrompt({ onNotice }: PushNotificationPromptProps) {
  const [permission, setPermission] = useState(() =>
    typeof window === 'undefined' ? 'unsupported' : getCurrentPushPermission(),
  )
  const [isEnabling, setIsEnabling] = useState(false)

  const state = useMemo(() => {
    if (!isPushNotificationSupported()) return 'unsupported'
    if (permission === 'granted') return 'granted'
    if (permission === 'denied') return 'denied'
    return 'available'
  }, [permission])

  if (state === 'unsupported' || state === 'granted') {
    return null
  }

  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      await enablePushNotifications()
      setPermission(getCurrentPushPermission())
      onNotice('เปิดการแจ้งเตือนสำหรับ Admin แล้ว')
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'เปิดการแจ้งเตือนไม่สำเร็จ')
    } finally {
      setIsEnabling(false)
    }
  }

  return (
    <Alert
      severity={state === 'denied' ? 'warning' : 'info'}
      icon={<NotificationsActiveIcon />}
      sx={{ borderRadius: 4, alignItems: 'center' }}
      action={
        <Button disabled={isEnabling || state === 'denied'} onClick={handleEnable} variant="contained">
          {state === 'denied' ? 'ถูกปิดใน Browser' : isEnabling ? 'กำลังเปิด...' : 'เปิดแจ้งเตือน'}
        </Button>
      }
    >
      <Stack spacing={0.3}>
        <Typography sx={{ fontWeight: 800 }}>แจ้งเตือนเมื่อมีคิวใหม่</Typography>
        <Typography variant="body2">
          {state === 'denied'
            ? 'ต้องเปิด permission จาก browser settings ก่อน'
            : 'ระบบจะรับ push notification ผ่าน service worker ของ Admin'}
        </Typography>
      </Stack>
    </Alert>
  )
}
