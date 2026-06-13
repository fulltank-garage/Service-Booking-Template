import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Portal,
  Select,
  Skeleton,
  Stack,
  Switch,
  type SwitchProps,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { overlay } from '../../../theme/theme'
import { adminApi, type BookingPayload, type ServicePayload } from '../../../api/adminApi'
import { addDaysToISODate, formatThaiDateLabel, todayISO } from '../../../utils/dateFormat'
import type { Booking, BookingSettings, BookingStatus, DailyBookingSummary, PushHealthReport, ServiceItem } from '../../../types/admin'
import { bufferMinuteOptions, MOBILE_FLOATING_TOP, reminderLeadOptions, shopTimeOptions, SIDEBAR_WIDTH } from '../constants/dashboardOptions'
import { getBookingDateBlockReason } from '../utils/bookingDateRules'
import { getBookingStatusAction, getBookingStatusConfirmation, isClosedBookingStatus, statusChipSx, statusChipTextSx, statusLabels } from '../utils/bookingStatus'
import { digitsOnly, formatNotificationTimestamp, formatShopNotificationBody, formatShopNotificationTitle, formatThaiPrice } from '../utils/formatters'
import { SummaryCard, TableSkeleton } from './dashboardSkeletons'


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
