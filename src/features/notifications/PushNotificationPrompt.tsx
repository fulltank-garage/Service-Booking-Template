import { useMemo, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, Stack, Typography, useMediaQuery } from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { useTheme } from '@mui/material/styles'
import {
  enablePushNotifications,
  getCurrentPushPermission,
  isPushNotificationSupported,
} from './pushNotifications'

type PushNotificationPromptProps = {
  onNotice: (message: string) => void
}

export function PushNotificationPrompt({ onNotice }: PushNotificationPromptProps) {
  const theme = useTheme()
  const isTabletOrMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const [permission, setPermission] = useState(() =>
    typeof window === 'undefined' ? 'unsupported' : getCurrentPushPermission(),
  )
  const [isDismissed, setIsDismissed] = useState(false)
  const [isEnabling, setIsEnabling] = useState(false)

  const state = useMemo(() => {
    if (!isPushNotificationSupported()) return 'unsupported'
    if (permission === 'granted') return 'granted'
    if (permission === 'denied') return 'denied'
    return 'available'
  }, [permission])

  if (!isTabletOrMobile || isDismissed || state === 'unsupported' || state === 'granted') {
    return null
  }

  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      await enablePushNotifications()
      setPermission(getCurrentPushPermission())
      onNotice('เปิดการแจ้งเตือนแล้ว')
      setIsDismissed(true)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'เปิดการแจ้งเตือนไม่สำเร็จ')
    } finally {
      setIsEnabling(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => setIsDismissed(true)}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            outline: 'none',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Stack
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'secondary.main',
              color: 'primary.main',
            }}
          >
            <NotificationsActiveIcon />
          </Stack>
          <Stack spacing={0.6}>
            <Typography variant="h2" sx={{ fontSize: '1.45rem' }}>
              แจ้งเตือนเมื่อมีคิวใหม่
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state === 'denied'
                ? 'ต้องเปิดสิทธิ์แจ้งเตือนจากการตั้งค่าเบราว์เซอร์ก่อน'
                : 'เปิดไว้เพื่อให้ทีมงานไม่พลาดคำขอจองใหม่'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
        <Button variant="outlined" onClick={() => setIsDismissed(true)}>
          ไว้ก่อน
        </Button>
        <Button disabled={isEnabling || state === 'denied'} onClick={handleEnable} variant="contained">
          {state === 'denied' ? 'ถูกปิดใน Browser' : isEnabling ? 'กำลังเปิด...' : 'เปิดแจ้งเตือน'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
