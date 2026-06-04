import { Box } from '@mui/material'

type BrandMarkProps = {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        component="img"
        src="/booking-queue-logo.png"
        alt="BookingQueue"
        sx={{
          width: compact ? 72 : 146,
          height: compact ? 42 : 58,
          borderRadius: 2,
          objectFit: 'contain',
        }}
      />
    </Box>
  )
}
