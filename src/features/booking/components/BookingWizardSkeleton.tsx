import { Box, Card, CardContent, Grid, Skeleton, Stack } from '@mui/material'

export function BookingWizardSkeleton() {
  return (
    <Card data-testid="booking-wizard-skeleton" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.25}>
          <Box>
            <Skeleton variant="text" width={110} height={42} sx={{ bgcolor: 'divider' }} />
            <Skeleton variant="text" width={260} height={28} sx={{ bgcolor: 'divider' }} />
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1.5 }}>
            <Stack spacing={0.6} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Skeleton variant="text" width={140} height={28} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width={74} height={22} sx={{ bgcolor: 'divider' }} />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.6 }}>
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={`weekday-${index}`} variant="text" height={22} sx={{ bgcolor: 'divider' }} />
              ))}
              {Array.from({ length: 42 }).map((_, index) => (
                <Skeleton key={`day-${index}`} variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              ))}
            </Box>
            <Stack direction="row" spacing={0.6} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
              <Skeleton variant="rectangular" width={118} height={40} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" width={108} height={40} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            </Stack>
          </Box>
          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width={100} height={32} sx={{ bgcolor: 'divider' }} />
            </Stack>
            <Grid container spacing={1.2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid size={{ xs: 6 }} key={`slot-${index}`}>
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
