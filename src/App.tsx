import { useEffect, useState } from 'react'
import { Box, Container } from '@mui/material'
import { BrandMark } from './components/BrandMark'
import { BookingSuccessPage } from './features/booking/BookingSuccessPage'
import { ServicesCatalogPage } from './features/booking/ServicesCatalogPage'
import { BookingWizard } from './features/booking/BookingWizard'
import { initializeLiff, type LineProfile } from './integrations/liff'
import type { Booking } from './types/booking'

const latestBookingStorageKey = 'bookingQueue.latestBooking'

const getCurrentPath = () => {
  const path = window.location.pathname
  if (path === '/services') return 'services'
  if (path === '/booking/success') return 'success'
  return 'booking'
}

const readLatestBooking = () => {
  try {
    const raw = window.localStorage.getItem(latestBookingStorageKey)
    return raw ? (JSON.parse(raw) as Booking) : null
  } catch {
    return null
  }
}

function App() {
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null)
  const [activePage, setActivePage] = useState(getCurrentPath)
  const [latestBooking, setLatestBooking] = useState<Booking | null>(() => readLatestBooking())

  useEffect(() => {
    if (activePage === 'services' || lineProfile) {
      return
    }

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
  }, [activePage, lineProfile])

  useEffect(() => {
    const handlePopState = () => setActivePage(getCurrentPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setActivePage(getCurrentPath())
  }

  const handleBookingConfirmed = (booking: Booking) => {
    setLatestBooking(booking)
    try {
      window.localStorage.setItem(latestBookingStorageKey, JSON.stringify(booking))
    } catch {
      // Ignore storage failures inside restricted LIFF browsers.
    }
    navigate('/booking/success')
  }

  const pageContent =
    activePage === 'services' ? (
      <ServicesCatalogPage />
    ) : activePage === 'success' ? (
      <BookingSuccessPage
        fallbackBooking={latestBooking}
        lineProfile={lineProfile}
        onStartBooking={() => navigate('/booking')}
      />
    ) : (
      <BookingWizard lineProfile={lineProfile} onBookingConfirmed={handleBookingConfirmed} />
    )

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
        {pageContent}
      </Container>
    </Box>
  )
}

export default App
