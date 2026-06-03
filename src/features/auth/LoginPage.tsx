import { FormEvent, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import { adminApi } from '../../api/adminApi'
import { BrandMark } from '../../components/BrandMark'
import type { StoredAdminSession } from './authStorage'

type LoginPageProps = {
  onAuthenticated: (session: StoredAdminSession) => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const session = await adminApi.login(email, password)
      onAuthenticated({ email: session.email, token: session.token })
    } catch {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'grid', placeItems: 'center', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack component="form" spacing={2.4} onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
              <BrandMark />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2">เข้าสู่ระบบ</Typography>
              <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>สำหรับผู้ดูแลระบบจองคิว</Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="อีเมล"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="รหัสผ่าน"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" endIcon={<LoginIcon />} disabled={isSubmitting}>
              {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
