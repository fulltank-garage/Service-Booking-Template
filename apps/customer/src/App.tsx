import { Suspense, lazy, useEffect, useState } from 'react'
import { Box, Container } from '@mui/material'
import { BrandMark } from './components/BrandMark'
import type { LineProfile } from './integrations/liff'
import type { Booking } from './types/booking'
import { initializeLiffOnce } from './appLiffSession'
import { preloadBookingBootstrap } from './features/booking/bookingBootstrap'
import { CustomerPageSkeleton } from './features/booking/components/CustomerPageSkeleton'
import { LineAppRequiredPage } from './features/booking/components/LineAppRequiredPage'
import { clearLatestBooking, readLatestBooking, saveLatestBooking } from './features/booking/services/latestBookingStorage'
import { getCurrentCustomerPage } from './features/booking/utils/customerRoute'

const loadBookingWizardModule = () => import('./features/booking/BookingWizard')

const BookingWizard = lazy(() => loadBookingWizardModule().then((module) => ({ default: module.BookingWizard })))
const BookingSuccessPage = lazy(() =>
  import('./features/booking/BookingSuccessPage').then((module) => ({ default: module.BookingSuccessPage })),
)
const ServicesCatalogPage = lazy(() =>
  import('./features/booking/ServicesCatalogPage').then((module) => ({ default: module.ServicesCatalogPage })),
)

function App() {
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null)
  const [activePage, setActivePage] = useState(getCurrentCustomerPage)
  const [latestBooking, setLatestBooking] = useState<Booking | null>(() => readLatestBooking())
  const [autoCloseSuccess, setAutoCloseSuccess] = useState(false)
  const [isLiffReady, setIsLiffReady] = useState(false)
  const [lineAppRequired, setLineAppRequired] = useState(false)
  const [readyBookingEntryUserId, setReadyBookingEntryUserId] = useState('')
  const isWaitingForBookingEntry =
    activePage === 'booking' && Boolean(lineProfile?.userId) && readyBookingEntryUserId !== lineProfile?.userId
  const canRenderCustomerPage = activePage === 'services' || ((Boolean(lineProfile) || isLiffReady) && !isWaitingForBookingEntry)

  useEffect(() => {
    if (activePage === 'services' || lineProfile) {
      return
    }

    let active = true
    initializeLiffOnce()
      .then((profile) => {
        if (!active) return
        setLineProfile(profile)
        setLineAppRequired(!profile)
        setIsLiffReady(true)
      })
      .catch(() => {
        if (!active) return
        setLineProfile(null)
        setLineAppRequired(true)
        setIsLiffReady(true)
      })

    return () => {
      active = false
    }
  }, [activePage, lineProfile])

  useEffect(() => {
    const handlePopState = () => setActivePage(getCurrentCustomerPage())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (activePage !== 'booking' || !lineProfile?.userId) {
      return undefined
    }

    let active = true

    Promise.all([loadBookingWizardModule(), preloadBookingBootstrap()])
      .catch(() => undefined)
      .finally(() => {
        if (active) setReadyBookingEntryUserId(lineProfile.userId)
      })

    return () => {
      active = false
    }
  }, [activePage, lineProfile?.userId])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setActivePage(getCurrentCustomerPage())
  }

  const handleBookingConfirmed = (booking: Booking) => {
    setLatestBooking(booking)
    saveLatestBooking(booking)
    setAutoCloseSuccess(true)
    navigate('/booking/success')
  }

  const handleBookingUpdated = (booking: Booking) => {
    setLatestBooking(booking)
    saveLatestBooking(booking)
  }

  const handleBookingCancelled = () => {
    setLatestBooking(null)
    setAutoCloseSuccess(false)
    clearLatestBooking()
    navigate('/booking')
  }

  const pageContent =
    activePage === 'services' ? (
      <ServicesCatalogPage />
    ) : !canRenderCustomerPage ? (
      <CustomerPageSkeleton activePage={activePage} />
    ) : lineAppRequired && !lineProfile ? (
      <LineAppRequiredPage />
    ) : activePage === 'success' ? (
      <BookingSuccessPage
        autoCloseOnSuccess={autoCloseSuccess}
        fallbackBooking={latestBooking}
        lineProfile={lineProfile}
        onBookingCancelled={handleBookingCancelled}
        onBookingUpdated={handleBookingUpdated}
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
        <Suspense fallback={<CustomerPageSkeleton activePage={activePage} />}>{pageContent}</Suspense>
      </Container>
    </Box>
  )
}

export default App
