import { useEffect, useState } from 'react'
import { Box, Container } from '@mui/material'
import { BrandMark } from './components/BrandMark'
import { BookingWizard } from './features/booking/BookingWizard'
import { initializeLiff, type LineProfile } from './integrations/liff'

function App() {
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null)

  useEffect(() => {
    let active = true
    initializeLiff()
      .then((profile) => {
        if (active) setLineProfile(profile)
      })
      .catch(() => {
        if (active) setLineProfile(null)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 430,
            mx: 'auto',
            minHeight: 68,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BrandMark />
        </Box>
      </Box>

      <Container maxWidth={false} sx={{ width: '100%', maxWidth: 430, px: 2, py: 2.5, mx: 'auto' }}>
        <BookingWizard lineProfile={lineProfile} />
      </Container>
    </Box>
  )
}

export default App
