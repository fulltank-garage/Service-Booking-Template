import { Box, Card, CardContent, Divider, Grid, Skeleton, Stack } from '@mui/material'

export function BookingSuccessSkeleton() {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
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
              <Grid size={{ xs: 12, sm: 6 }} key={`booking-info-skeleton-${index}`}>
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
