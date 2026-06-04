import { useEffect, useState } from 'react'
import { Alert, Box, Card, CardContent, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material'
import RoomServiceIcon from '@mui/icons-material/RoomService'
import { bookingApi } from '../../api/bookingApi'
import type { ServiceItem } from '../../types/booking'

const formatThaiPrice = (priceCents: number) =>
  `${new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(priceCents / 100)} บาท`

let servicesCache: ServiceItem[] | null = null
let servicesRequest: Promise<ServiceItem[]> | null = null

const loadServicesOnce = () => {
  servicesRequest ??= bookingApi.listServices().then((items) => {
    servicesCache = items
    return items
  })
  return servicesRequest
}

export function ServicesCatalogPage() {
  const [services, setServices] = useState<ServiceItem[]>(() => servicesCache ?? [])
  const [isLoading, setIsLoading] = useState(() => !servicesCache)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!servicesCache) setIsLoading(true)
      setError('')
      try {
        const items = await loadServicesOnce()
        if (active) setServices(items)
      } catch {
        servicesRequest = null
        if (active) setError('โหลดข้อมูลบริการไม่สำเร็จ')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>
          บริการทางร้าน
        </Typography>
        <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
          รายการบริการทั้งหมดดึงจากระบบ Admin
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={132} sx={{ borderRadius: 3, bgcolor: 'divider' }} />
          ))}
        </Stack>
      ) : services.length === 0 ? (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.25, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 900 }}>ยังไม่มีรายการบริการ</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {services.map((service) => (
            <Card key={service.id} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1.3}>
                  <Stack direction="row" spacing={1.3} sx={{ alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: 2.2,
                        bgcolor: 'secondary.main',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <RoomServiceIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: '1.18rem', fontWeight: 950, lineHeight: 1.2 }}>
                        {service.nameTh}
                      </Typography>
                      <Typography sx={{ mt: 0.45, color: 'text.secondary', lineHeight: 1.5 }}>
                        {service.descriptionTh || 'ดูรายละเอียดและเลือกเวลาจองได้จากหน้าเริ่มการจอง'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider />
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip color="secondary" label={`${service.durationMinutes} นาที`} />
                    <Typography sx={{ color: 'primary.main', fontWeight: 950 }}>
                      {formatThaiPrice(service.priceCents)}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
