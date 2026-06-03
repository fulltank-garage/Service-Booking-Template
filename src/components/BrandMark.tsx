import { Box, Typography } from '@mui/material'

export function BrandMark() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <Box component="img" src="/logo.svg" alt="Service Booking Admin" sx={{ width: 42, height: 42, borderRadius: 2 }} />
      <Box>
        <Typography component="p" sx={{ fontWeight: 850, lineHeight: 1 }}>
          Booking Center
        </Typography>
        <Typography component="p" variant="caption" color="text.secondary">
          จัดการคิวบริการ
        </Typography>
      </Box>
    </Box>
  )
}
