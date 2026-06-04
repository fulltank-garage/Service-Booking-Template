import { useEffect, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { LoginPage } from './features/auth/LoginPage'
import { authStorage, type StoredAdminSession } from './features/auth/authStorage'
import { BrandMark } from './components/BrandMark'
import { useAppUpdate } from './hooks/useAppUpdate'

function App() {
  const [session, setSession] = useState<StoredAdminSession | null>(() => authStorage.getSession())
  const [isBooting, setIsBooting] = useState(true)
  const { applyAppUpdate, hasPendingAppUpdate, isInitialUpdateCheckDone } = useAppUpdate()

  useEffect(() => {
    if (!isInitialUpdateCheckDone) return undefined

    const timer = window.setTimeout(() => setIsBooting(false), 700)
    return () => window.clearTimeout(timer)
  }, [isInitialUpdateCheckDone])

  const handleAuthenticated = (nextSession: StoredAdminSession) => {
    authStorage.setSession(nextSession)
    setSession(nextSession)
  }

  const handleLogout = () => {
    authStorage.clear()
    setSession(null)
  }

  if (isBooting) {
    return <StartupSplash isUpdated={hasPendingAppUpdate} />
  }

  if (!session) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <DashboardPage
      adminEmail={session.email}
      adminName={session.name}
      applyAppUpdate={applyAppUpdate}
      hasPendingAppUpdate={hasPendingAppUpdate}
      onLogout={handleLogout}
    />
  )
}

function StartupSplash({ isUpdated }: { isUpdated: boolean }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#080205', color: '#FFFFFF', px: 3 }}>
      <Stack
        spacing={2.2}
        sx={{
          alignItems: 'center',
          textAlign: 'center',
          '& .MuiTypography-root': { color: '#FFFFFF' },
          '& .MuiTypography-caption': { color: 'rgba(255,255,255,0.58)' },
        }}
      >
        <BrandMark />
        <Typography sx={{ color: 'primary.main', fontSize: '1rem', fontWeight: 950 }}>
          {isUpdated ? 'มีการอัพเดต app' : 'กำลังเข้าสู่ระบบ admin'}
        </Typography>
      </Stack>
    </Box>
  )
}

export default App
