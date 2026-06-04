import { Box, Typography } from '@mui/material'

export function BrandMark() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1.15 }}>
      <Box
        component="img"
        src="/booking-queue-logo.png"
        alt="BookingQueue logo"
        sx={{
          width: 46,
          height: 46,
          borderRadius: 1.6,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography
          component="p"
          sx={{
            color: 'text.primary',
            fontFamily: '"Roboto", sans-serif',
            fontSize: '1.16rem',
            fontWeight: 900,
            lineHeight: 1.02,
          }}
        >
          BookingQueue
        </Typography>
        <Typography
          component="p"
          sx={{
            color: 'text.secondary',
            fontFamily: '"Noto Sans Thai", sans-serif',
            fontSize: '0.8rem',
            fontWeight: 760,
            lineHeight: 1.25,
          }}
        >
          ระบบจองคิว
        </Typography>
      </Box>
    </Box>
  )
}
