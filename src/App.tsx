import { Suspense, lazy, useEffect, useState } from 'react'
import { Box, Card, CardContent, Container, Divider, Grid, Skeleton, Stack } from '@mui/material'
import { BrandMark } from './components/BrandMark'
import type { LineProfile } from './integrations/liff'
import type { Booking } from './types/booking'
import { initializeLiffOnce } from './appLiffSession'
import { preloadBookingBootstrap } from './features/booking/bookingBootstrap'

const loadBookingWizardModule = () => import('./features/booking/BookingWizard')

const BookingWizard = lazy(() => loadBookingWizardModule().then((module) => ({ default: module.BookingWizard })))
const BookingSuccessPage = lazy(() =>
  import('./features/booking/BookingSuccessPage').then((module) => ({ default: module.BookingSuccessPage })),
)
const ServicesCatalogPage = lazy(() =>
  import('./features/booking/ServicesCatalogPage').then((module) => ({ default: module.ServicesCatalogPage })),
)

const latestBookingStorageKey = 'bookingQueue.latestBooking'
type CustomerPage = 'booking' | 'success' | 'services'

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

const getCurrentPath = (): CustomerPage => {
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
    const handlePopState = () => setActivePage(getCurrentPath())
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

function LineAppRequiredPage() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: 'calc(100vh - 128px)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Stack spacing={1.2}>
          <Box component="h2" sx={{ m: 0, fontSize: '1.45rem', fontWeight: 900, lineHeight: 1.2 }}>
            กรุณาเปิดผ่านแอป LINE
          </Box>
          <Box sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.65 }}>
            หน้าจองคิวและข้อมูลการจองใช้งานได้เมื่อเปิดจากแอป LINE เท่านั้น
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

function CustomerPageSkeleton({ activePage }: { activePage: CustomerPage }) {
  if (activePage === 'services') {
    return (
      <Stack data-testid="customer-page-skeleton" spacing={2}>
        <Skeleton variant="text" width={180} height={44} sx={{ bgcolor: 'divider' }} />
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
        <ServiceCardSkeleton />
      </Stack>
    )
  }

  if (activePage === 'success') {
    return (
      <Card data-testid="customer-page-skeleton" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={2.4}>
            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
              <Skeleton variant="rounded" width={54} height={54} sx={{ borderRadius: 2.4, bgcolor: 'divider', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Skeleton variant="text" width="72%" height={40} sx={{ bgcolor: 'divider' }} />
                <Skeleton variant="text" width="42%" height={26} sx={{ bgcolor: 'divider' }} />
              </Box>
            </Stack>
            <Skeleton variant="rectangular" height={74} sx={{ borderRadius: 3, bgcolor: 'divider' }} />
            <Grid container spacing={1.4}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`app-booking-info-skeleton-${index}`}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4 }}>
                    <Skeleton variant="text" width={78} height={18} sx={{ bgcolor: 'divider' }} />
                    <Skeleton variant="text" width="68%" height={28} sx={{ mt: 0.35, bgcolor: 'divider' }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Skeleton variant="rectangular" height={38} sx={{ flex: 1, borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={38} sx={{ flex: 1, borderRadius: 2, bgcolor: 'divider' }} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="customer-page-skeleton" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.25}>
          <Box>
            <Skeleton variant="text" width={110} height={42} sx={{ bgcolor: 'divider' }} />
            <Skeleton variant="text" width={260} height={28} sx={{ bgcolor: 'divider' }} />
          </Box>
          <Skeleton variant="rectangular" height={338} sx={{ borderRadius: 3, bgcolor: 'divider' }} />
          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width={100} height={32} sx={{ bgcolor: 'divider' }} />
            </Stack>
            <Grid container spacing={1.2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid size={{ xs: 6 }} key={`app-slot-skeleton-${index}`}>
                  <Skeleton variant="rectangular" height={62} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
                </Grid>
              ))}
            </Grid>
          </Box>
          <Stack spacing={1.5}>
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={104} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
          </Stack>
          <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
        </Stack>
      </CardContent>
    </Card>
  )
}

function ServiceCardSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1.3}>
          <Box sx={{ minWidth: 0 }}>
            <Skeleton variant="text" width="54%" height={30} sx={{ bgcolor: 'divider' }} />
            <Skeleton variant="text" width="92%" height={24} sx={{ mt: 0.45, bgcolor: 'divider' }} />
            <Skeleton variant="text" width="72%" height={24} sx={{ bgcolor: 'divider' }} />
          </Box>
          <Divider />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton variant="rounded" width={86} height={32} sx={{ borderRadius: 4, bgcolor: 'divider' }} />
            <Skeleton variant="text" width={78} height={28} sx={{ bgcolor: 'divider' }} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default App
