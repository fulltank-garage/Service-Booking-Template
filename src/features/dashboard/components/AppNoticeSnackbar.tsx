import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { MOBILE_FLOATING_TOP, SIDEBAR_WIDTH } from '../constants/dashboardOptions'

export function AppNoticeSnackbar({ message, onClose }: { message: string; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!message) return undefined
    const showTimer = window.setTimeout(() => setIsVisible(true), 20)
    const hideTimer = window.setTimeout(() => setIsVisible(false), 3200)
    const closeTimer = window.setTimeout(onClose, 3520)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
      window.clearTimeout(closeTimer)
      setIsVisible(false)
    }
  }, [message, onClose])

  if (!message) return null

  return (
    <Box
      role="status"
      sx={{
        position: 'fixed',
        top: { xs: MOBILE_FLOATING_TOP, lg: 24 },
        left: { xs: '50%', lg: `calc(${SIDEBAR_WIDTH}px + ((100vw - ${SIDEBAR_WIDTH}px) / 2))` },
        zIndex: 1100,
        width: 'calc(100vw - 32px)',
        maxWidth: 420,
        transform: `translate(-50%, ${isVisible ? '0' : '-18px'})`,
        opacity: isVisible ? 1 : 0,
        transition: 'transform 260ms ease, opacity 260ms ease',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 2.5,
        px: 2,
        py: 1.35,
        boxShadow: 'none',
        textAlign: 'center',
        fontWeight: 850,
      }}
    >
      {message}
    </Box>
  )
}
