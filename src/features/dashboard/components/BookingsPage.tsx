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
import { BookingsCard } from './BookingsCard'

export function BookingsPage({
  bookingSettings,
  bookings,
  query,
  selectedDate,
  services,
  simpleMode,
  statusFilter,
  onCreateBooking,
  onDeleteBooking,
  onExportBookings,
  onNextDay,
  onPreviousDay,
  onQueryChange,
  onStatusFilterChange,
  onStatusChange,
  onUpdateBooking,
}: {
  bookingSettings: BookingSettings | null
  bookings: Booking[]
  query: string
  selectedDate: string
  services: ServiceItem[]
  simpleMode: boolean
  statusFilter: BookingStatus | 'all'
  onCreateBooking: (payload: Omit<BookingPayload, 'status'>) => Promise<void>
  onDeleteBooking: (booking: Booking) => void
  onExportBookings: () => void | Promise<void>
  onNextDay: () => void
  onPreviousDay: () => void
  onQueryChange: (query: string) => void
  onStatusFilterChange: (status: BookingStatus | 'all') => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void | Promise<void>
  onUpdateBooking: (booking: Booking, payload: BookingPayload) => Promise<void>
}) {
  return (
    <BookingsCard
      bookings={bookings}
      bookingSettings={bookingSettings}
      query={query}
      selectedDate={selectedDate}
      services={services}
      simpleMode={simpleMode}
      statusFilter={statusFilter}
      onCreateBooking={onCreateBooking}
      onDeleteBooking={onDeleteBooking}
      onExportBookings={onExportBookings}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
      onQueryChange={onQueryChange}
      onStatusFilterChange={onStatusFilterChange}
      onStatusChange={onStatusChange}
      onUpdateBooking={onUpdateBooking}
    />
  )
}
