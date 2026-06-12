import { Box, IconButton, Stack, Typography } from '@mui/material'
import { pageLabels, SAFE_AREA_TOP, SIDEBAR_WIDTH, type AdminPage } from '../constants/dashboardOptions'

type AdminTopbarProps = {
  activePage: AdminPage
  hasPendingAppUpdate: boolean
  onOpenNav: () => void
}

export function AdminTopbar({ activePage, hasPendingAppUpdate, onOpenNav }: AdminTopbarProps) {
  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: { xs: 0, lg: SIDEBAR_WIDTH },
        right: 0,
        zIndex: 30,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pt: { xs: SAFE_AREA_TOP, lg: 0 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          minHeight: { xs: 72, lg: 72 },
          px: { xs: 2.5, sm: 2.5, lg: 2.5 },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <IconButton
          aria-label="เปิดเมนู"
          onClick={onOpenNav}
          sx={{
            width: 'auto',
            minWidth: 64,
            height: 46,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            display: { xs: 'inline-flex', lg: 'none' },
            px: 1.5,
            fontSize: '0.9rem',
            fontWeight: 900,
          }}
        >
          เมนู
          {hasPendingAppUpdate && (
            <Box
              component="span"
              className="app-update-pulse"
              sx={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%', bgcolor: '#FF008C', border: '2px solid #FFFFFF' }}
            />
          )}
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ minWidth: 0, textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: 'primary.main', display: 'block', fontWeight: 850, lineHeight: 1.1 }}>
            Service Booking Admin
          </Typography>
          <Typography sx={{ fontSize: { xs: '1rem', sm: '1.16rem', lg: '1.55rem' }, fontWeight: 900, lineHeight: 1.1 }}>
            {pageLabels[activePage]}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
