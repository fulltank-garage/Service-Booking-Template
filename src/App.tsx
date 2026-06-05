import { Suspense, lazy, useEffect, useState } from 'react'
import { Box, Container, Skeleton, Stack } from '@mui/material'
import { BrandMark } from './components/BrandMark'
import { initializeLiff, type LineProfile } from './integrations/liff'
import type { Booking } from './types/booking'

const BookingWizard = lazy(() => import('./features/booking/BookingWizard').then((module) => ({ default: module.BookingWizard })))
const BookingSuccessPage = lazy(() =>
  import('./features/booking/BookingSuccessPage').then((module) => ({ default: module.BookingSuccessPage })),
)
const ServicesCatalogPage = lazy(() =>
  import('./features/booking/ServicesCatalogPage').then((module) => ({ default: module.ServicesCatalogPage })),
)

const latestBookingStorageKey = 'bookingQueue.latestBooking'

const getLiffStatePath = () => {
  const liffState = new URLSearchParams(window.location.search).get('liff.state')
  if (!liffState) {
    return ''
  }

  try {
    const decodedPath = decodeURIComponent(liffState)
    return decodedPath.startsWith('/') ? decodedPath.split('?')[0] : ''
  } catch {
    return liffState.startsWith('/') ? liffState.split('?')[0] : ''
  }
}

const getCurrentPath = () => {
  const path = getLiffStatePath() || window.location.pathname
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
  const [autoCloseSuccess, setAutoCloseSuccess] = useState(false)

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
    setAutoCloseSuccess(true)
    navigate('/booking/success')
  }

  const handleBookingCancelled = () => {
    setLatestBooking(null)
    setAutoCloseSuccess(false)
    try {
      window.localStorage.removeItem(latestBookingStorageKey)
    } catch {
      // Ignore storage failures inside restricted LIFF browsers.
    }
    navigate('/booking')
  }

  const pageContent =
    activePage === 'services' ? (
      <ServicesCatalogPage />
    ) : activePage === 'success' ? (
      <BookingSuccessPage
        autoCloseOnSuccess={autoCloseSuccess}
        fallbackBooking={latestBooking}
        lineProfile={lineProfile}
        onBookingCancelled={handleBookingCancelled}
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
        <Suspense fallback={<CustomerPageSkeleton />}>{pageContent}</Suspense>
      </Container>
    </Box>
  )
}

function CustomerPageSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={72} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />
    </Stack>
  )
}

export default App
