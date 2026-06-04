import { Box } from '@mui/material'

export function BrandMark() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        component="img"
        src="/booking-queue-logo.png"
        alt="BookingQueue"
        sx={{
          width: 156,
          height: 62,
          borderRadius: 2,
          objectFit: 'contain',
        }}
      />
    </Box>
  )
}
