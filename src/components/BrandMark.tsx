import { Box, Typography } from '@mui/material'

type BrandMarkProps = {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1.15 }}>
      <Box
        component="img"
        src="/booking-queue-logo.png"
        alt="BookingQueue logo"
        sx={{
          width: compact ? 34 : 44,
          height: compact ? 34 : 44,
          borderRadius: 1.6,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      {!compact && (
        <Box sx={{ minWidth: 0, textAlign: 'left' }}>
          <Typography
            component="p"
            sx={{
              color: 'text.primary',
              fontFamily: '"Roboto", sans-serif',
              fontSize: '1.08rem',
              fontWeight: 900,
              lineHeight: 1.02,
            }}
          >
            <Box component="span" sx={{ color: 'text.primary' }}>
              Booking
            </Box>
            <Box component="span" sx={{ color: '#FF008C' }}>
              Queue
            </Box>
          </Typography>
          <Typography
            component="p"
            sx={{
              color: 'text.secondary',
              fontFamily: '"Noto Sans Thai", sans-serif',
              fontSize: '0.78rem',
              fontWeight: 760,
              lineHeight: 1.25,
            }}
          >
            ระบบจองคิว
          </Typography>
        </Box>
      )}
    </Box>
  )
}
