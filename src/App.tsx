import { useEffect, useState } from 'react'
import { Box, Container, Stack, Typography } from '@mui/material'
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
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack spacing={{ xs: 3, md: 5 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <BrandMark />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '0.82fr 1.18fr' },
              gap: { xs: 3, md: 5 },
              alignItems: 'center',
            }}
          >
            <Stack spacing={2.5}>
              <Typography variant="h1">จองคิวบริการได้ทันที</Typography>
              <Typography sx={{ maxWidth: 560, color: 'text.secondary', fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
                เลือกบริการ วัน เวลา และส่งข้อมูลติดต่อให้ทีมงานดูแลต่อได้อย่างเป็นระเบียบในขั้นตอนเดียว
              </Typography>
              <Stack direction="row" spacing={1.2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {['เลือกบริการ', 'เลือกเวลา', 'กรอกข้อมูล', 'รอยืนยัน'].map((item) => (
                  <Box
                    key={item}
                    sx={{
                      px: 1.8,
                      py: 0.8,
                      borderRadius: 2.25,
                      bgcolor: 'secondary.main',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontWeight: 750,
                      fontSize: 14,
                    }}
                  >
                    {item}
                  </Box>
                ))}
              </Stack>
            </Stack>

            <BookingWizard lineProfile={lineProfile} />
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

export default App
