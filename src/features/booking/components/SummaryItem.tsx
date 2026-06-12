import { Box, Grid, Typography } from '@mui/material'

export function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 900 }}>{value}</Typography>
      </Box>
    </Grid>
  )
}
