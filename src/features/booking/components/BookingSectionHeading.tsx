import { Box, Stack, Typography } from '@mui/material'

export function BookingSectionHeading({ step, title }: { step: number; title: string }) {
  return (
    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
      <Box sx={{ height: 2, flex: 1, minWidth: 24, borderRadius: 999, bgcolor: 'divider' }} />
      <Typography
        component="h3"
        variant="h3"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.8,
          flexShrink: 0,
          maxWidth: 'min(72%, 320px)',
          color: 'text.primary',
          fontSize: '1rem',
          fontWeight: 950,
          textAlign: 'center',
        }}
      >
        <Box
          component="span"
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.88rem',
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {step}
        </Box>
        <Box component="span" sx={{ minWidth: 0 }}>
          {title}
        </Box>
      </Typography>
      <Box sx={{ height: 2, flex: 1, minWidth: 24, borderRadius: 999, bgcolor: 'divider' }} />
    </Stack>
  )
}
