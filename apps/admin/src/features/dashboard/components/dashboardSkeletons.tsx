import type { ReactNode } from 'react'
import { Box, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material'
import { MOBILE_FLOATING_TOP, SIDEBAR_WIDTH, type AdminPage } from '../constants/dashboardOptions'

export function DashboardSkeleton({ activePage }: { activePage: AdminPage }) {
  if (activePage === 'services') return <ServicesSkeleton />
  if (activePage === 'bookings') return <TableSkeleton />

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={`summary-skeleton-${index}`}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Skeleton variant="rectangular" width={48} height={48} sx={{ borderRadius: 2.5, bgcolor: 'divider' }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={22} sx={{ bgcolor: 'divider' }} />
                    <Skeleton variant="text" width={46} height={36} sx={{ bgcolor: 'divider' }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

export function TableSkeleton({ columns = 5, rows = 6, titleWidth = 190 }: { columns?: number; rows?: number; titleWidth?: number } = {}) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Skeleton variant="text" width={titleWidth} height={38} sx={{ mb: 2, bgcolor: 'divider' }} />
        <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
          {Array.from({ length: Math.min(rows, 4) }).map((_, index) => (
            <Box key={`mobile-row-skeleton-${index}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.5 }}>
              <Skeleton variant="text" width="72%" height={24} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width="52%" height={20} sx={{ bgcolor: 'divider' }} />
              <Stack direction="row" spacing={1} sx={{ mt: 1.2, justifyContent: 'space-between' }}>
                <Skeleton variant="rectangular" width="28%" height={34} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
                <Skeleton variant="rectangular" width="28%" height={34} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
                <Skeleton variant="rectangular" width="28%" height={34} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              </Stack>
            </Box>
          ))}
        </Stack>
        <Stack spacing={1.2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 1.5 }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={`table-head-skeleton-${index}`} variant="text" height={30} sx={{ bgcolor: 'divider' }} />
            ))}
          </Box>
          {Array.from({ length: rows }).map((_, index) => (
            <Box key={`table-row-skeleton-${index}`} sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 1.5 }}>
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton key={`table-cell-skeleton-${index}-${columnIndex}`} variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              ))}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export function SummaryCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'secondary.main', color }}>
              {icon}
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h2">{value}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )
}

function ServicesSkeleton() {
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          position: 'fixed',
          top: { xs: MOBILE_FLOATING_TOP, lg: 88 },
          left: { xs: 20, sm: 20, lg: SIDEBAR_WIDTH + 20 },
          right: { xs: 20, sm: 20, lg: 20 },
          zIndex: 25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          p: 1.2,
          boxShadow: 'none',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rectangular" height={44} sx={{ flex: 1, borderRadius: 2, bgcolor: 'divider' }} />
          <Skeleton variant="rectangular" width={124} height={44} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
        </Stack>
      </Box>
      <Box sx={{ pt: { xs: 8, lg: 10 } }}>
        <TableSkeleton titleWidth={180} columns={4} rows={5} />
      </Box>
    </Stack>
  )
}
