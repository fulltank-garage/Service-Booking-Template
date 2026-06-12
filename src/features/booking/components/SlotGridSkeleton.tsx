import { Grid, Skeleton } from '@mui/material'

export function SlotGridSkeleton() {
  return (
    <Grid container spacing={1.2}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid size={{ xs: 6 }} key={`loading-slot-${index}`}>
          <Skeleton variant="rectangular" height={62} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
        </Grid>
      ))}
    </Grid>
  )
}
