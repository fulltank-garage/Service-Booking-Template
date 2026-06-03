import { useState } from 'react'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { LoginPage } from './features/auth/LoginPage'
import { authStorage, type StoredAdminSession } from './features/auth/authStorage'

function App() {
  const [session, setSession] = useState<StoredAdminSession | null>(() => authStorage.getSession())

  const handleAuthenticated = (nextSession: StoredAdminSession) => {
    authStorage.setSession(nextSession)
    setSession(nextSession)
  }

  const handleLogout = () => {
    authStorage.clear()
    setSession(null)
  }

  if (!session) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return <DashboardPage adminEmail={session.email} onLogout={handleLogout} />
}

export default App
