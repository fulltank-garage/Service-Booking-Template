import { Box, Typography } from '@mui/material'

type BrandMarkProps = {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        component="img"
        src="/logo.svg"
        alt="Service Booking"
        sx={{ width: compact ? 34 : 42, height: compact ? 34 : 42, borderRadius: 2 }}
      />
      {!compact && (
        <Box>
          <Typography component="p" sx={{ fontWeight: 850, lineHeight: 1, color: 'text.primary' }}>
            Service Booking
          </Typography>
          <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
            ระบบจองคิวบริการ
          </Typography>
        </Box>
      )}
    </Box>
  )
}
