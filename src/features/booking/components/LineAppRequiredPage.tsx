import { Box, Stack } from '@mui/material'

export function LineAppRequiredPage() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: 'calc(100vh - 128px)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Stack spacing={1.2}>
          <Box component="h2" sx={{ m: 0, fontSize: '1.45rem', fontWeight: 900, lineHeight: 1.2 }}>
            กรุณาเปิดผ่านแอป LINE
          </Box>
          <Box sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.65 }}>
            หน้าจองคิวและข้อมูลการจองใช้งานได้เมื่อเปิดจากแอป LINE เท่านั้น
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}
