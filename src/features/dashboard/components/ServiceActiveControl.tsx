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


const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#65C466',
        opacity: 1,
        border: 0,
        ...theme.applyStyles('dark', {
          backgroundColor: '#2ECA45',
        }),
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.grey[100],
      ...theme.applyStyles('dark', {
        color: theme.palette.grey[600],
      }),
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.7,
      ...theme.applyStyles('dark', {
        opacity: 0.3,
      }),
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 22,
    height: 22,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: '#E9E9EA',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
    ...theme.applyStyles('dark', {
      backgroundColor: '#39393D',
    }),
  },
}))

export function ServiceActiveControl({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <Stack
      spacing={0.45}
      sx={{
        alignItems: 'flex-start',
        flex: '0 0 72px',
        width: 72,
        minWidth: 72,
        minHeight: 43,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          width: 72,
          color: 'text.secondary',
          fontWeight: 850,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}
      >
        {checked ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
      </Typography>
      <IOSSwitch
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </Stack>
  )
}
