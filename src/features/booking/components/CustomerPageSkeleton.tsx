import { Box, Card, CardContent, Divider, Grid, Skeleton, Stack } from '@mui/material'
import type { CustomerPage } from '../types/navigation'

export function CustomerPageSkeleton({ activePage }: { activePage: CustomerPage }) {
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
