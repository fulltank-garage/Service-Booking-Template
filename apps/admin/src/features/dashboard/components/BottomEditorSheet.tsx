import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Box, Button, Portal, Stack, Typography } from '@mui/material'
import { overlay } from '../../../theme/theme'
import { SIDEBAR_WIDTH } from '../constants/dashboardOptions'


export function BottomEditorSheet({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  return (
    <Portal>
      <Box
        aria-hidden={!isOpen}
        data-testid="bottom-editor-overlay"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: { xs: 0, lg: SIDEBAR_WIDTH },
          zIndex: 1200,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <Box
          aria-hidden="true"
          data-testid="bottom-editor-backdrop"
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            border: 0,
            bgcolor: overlay.backgroundColor,
            backdropFilter: overlay.backdropFilter,
            WebkitBackdropFilter: overlay.backdropFilter,
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${isOpen ? 360 : 280}ms ease`,
          }}
        />
        <Box
          role="dialog"
          aria-modal="true"
          aria-label={title}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: { xs: 'calc(100% - 40px)', sm: 720 },
            maxWidth: 'calc(100% - 40px)',
            maxHeight: 'calc(100dvh - 40px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            boxShadow: 'none',
            transform: isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, calc(-50% + 46px)) scale(0.98)',
            opacity: isOpen ? 1 : 0,
            transition: `transform ${isOpen ? 520 : 420}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${isOpen ? 320 : 260}ms ease`,
            willChange: 'transform',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', p: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: '1.1rem', fontWeight: 950 }}>{title}</Typography>
            <Button variant="outlined" onClick={onClose}>
              ปิด
            </Button>
          </Stack>
          <Box sx={{ minHeight: 0, overflowY: 'auto', p: 2.5 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Portal>
  )
}
