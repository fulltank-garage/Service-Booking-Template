import { Suspense, lazy, useEffect, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { LoginPage } from './features/auth/LoginPage'
import { authStorage, type StoredAdminSession } from './features/auth/authStorage'
import { BrandMark } from './components/BrandMark'
import { useAppUpdate } from './hooks/useAppUpdate'
import { adminApi } from './api/adminApi'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))

function App() {
  const [session, setSession] = useState<StoredAdminSession | null>(() => authStorage.getSession())
  const [isBooting, setIsBooting] = useState(true)
  const [bootProgress, setBootProgress] = useState(8)
  const { applyAppUpdate, clearApplyingAppUpdate, hasPendingAppUpdate, isApplyingAppUpdate, isInitialUpdateCheckDone } = useAppUpdate()

  useEffect(() => {
    if (!isBooting) return undefined

    const timer = window.setInterval(() => {
      setBootProgress((current) => {
        if (isInitialUpdateCheckDone) return 100
        return Math.min(94, current + 11)
      })
    }, 120)

    return () => window.clearInterval(timer)
  }, [isBooting, isInitialUpdateCheckDone])

  useEffect(() => {
    if (!isInitialUpdateCheckDone) return undefined

    const progressTimer = window.setTimeout(() => setBootProgress(100), 0)
    const timer = window.setTimeout(() => {
      setIsBooting(false)
      clearApplyingAppUpdate()
    }, 700)
    return () => {
      window.clearTimeout(progressTimer)
      window.clearTimeout(timer)
    }
  }, [clearApplyingAppUpdate, isInitialUpdateCheckDone])

  const handleAuthenticated = (nextSession: StoredAdminSession) => {
    authStorage.setSession(nextSession)
    setSession(nextSession)
  }

  const handleLogout = () => {
    void adminApi.logout().catch(() => undefined)
    authStorage.clear()
    setSession(null)
  }

  if (isBooting) {
    return <StartupSplash isUpdating={hasPendingAppUpdate || isApplyingAppUpdate} progress={bootProgress} />
  }

  if (!session) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <Suspense fallback={<StartupSplash isUpdating={hasPendingAppUpdate || isApplyingAppUpdate} progress={100} />}>
      <DashboardPage
        adminEmail={session.email}
        adminName={session.name}
        applyAppUpdate={applyAppUpdate}
        hasPendingAppUpdate={hasPendingAppUpdate}
        onLogout={handleLogout}
      />
    </Suspense>
  )
}

function StartupSplash({ isUpdating, progress }: { isUpdating: boolean; progress: number }) {
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', px: 3 }}>
      <Stack spacing={2.2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <BrandMark />
        <Typography sx={{ color: 'primary.main', fontSize: '1rem', fontWeight: 950 }}>
          {isUpdating ? 'กำลังอัปเดตแอปพลิเคชั่น' : 'กำลังเข้าสู่ระบบแอดมิน'}
        </Typography>
        <Typography sx={{ color: 'text.primary', fontSize: '2.5rem', fontWeight: 950, lineHeight: 1 }}>
          {normalizedProgress}%
        </Typography>
      </Stack>
    </Box>
  )
}

export default App
