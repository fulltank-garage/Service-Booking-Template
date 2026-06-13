import { Box, Button, Stack, TextField } from '@mui/material'
import { MOBILE_FLOATING_TOP, SIDEBAR_WIDTH } from '../constants/dashboardOptions'


export function ManagementToolbar({
  addLabel,
  onAdd,
  onSearch,
  placeholder,
  query,
}: {
  addLabel: string
  onAdd: () => void
  onSearch: (value: string) => void
  placeholder: string
  query: string
}) {
  return (
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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <TextField
          placeholder={placeholder}
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Button variant="contained" onClick={onAdd} sx={{ minHeight: 44, px: { xs: 1.4, sm: 2 } }}>
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{addLabel}</Box>
        </Button>
      </Stack>
    </Box>
  )
}
