import { Card, CardContent, Stack, Typography } from '@mui/material'
import type { BookingPayload } from '../../../api/adminApi'
import type { Booking, BookingSettings, BookingStatus, ServiceItem } from '../../../types/admin'
import { useBookingsCardState } from '../hooks/useBookingsCardState'
import { BookingCreateSheet } from './BookingCreateSheet'
import { BookingEditSheet } from './BookingEditSheet'
import { BookingFilters } from './BookingFilters'
import { BookingDesktopTable, BookingMobileList, EmptyBookingState } from './BookingListViews'
import { BookingListSectionHeader, NextBookingPanel, TodayFocusPanel } from './BookingPanels'

export function BookingsCard({
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
  onStatusChange: (booking: Booking, status: BookingStatus) => void
  onUpdateBooking: (booking: Booking, payload: BookingPayload) => Promise<void>
}) {
  const state = useBookingsCardState({ bookings, onExportBookings, onUpdateBooking, selectedDate, services })
  const listProps = {
    bookings,
    onDeleteBooking,
    onEditBooking: state.openEditBooking,
    onOpenCreate: state.openCreateBooking,
    onStatusChange,
    simpleMode,
  }

  return (
    <>
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <BookingFilters
            isExporting={state.isExporting}
            query={query}
            selectedDate={selectedDate}
            statusFilter={statusFilter}
            onExport={state.handleExport}
            onNextDay={onNextDay}
            onOpenCreate={state.openCreateBooking}
            onPreviousDay={onPreviousDay}
            onQueryChange={onQueryChange}
            onStatusFilterChange={onStatusFilterChange}
          />
          {state.nextBooking && (
            <>
              <TodayFocusPanel booking={state.nextBooking} simpleMode={simpleMode} onDeleteBooking={onDeleteBooking} onEditBooking={state.openEditBooking} onStatusChange={onStatusChange} />
              <NextBookingPanel booking={state.nextBooking} />
            </>
          )}
          <BookingListSectionHeader hasBookings={bookings.length > 0} />
          <Typography sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 760 }}>
            รอจัดการ = ลูกค้าจองเข้ามาแล้ว · ยืนยันแล้ว = ร้านรับคิวนี้แล้ว · เสร็จสิ้น = ร้านทำคิวนี้เสร็จแล้ว
          </Typography>
          {bookings.length === 0 ? (
            <EmptyBookingState onOpenCreate={state.openCreateBooking} />
          ) : (
            <Stack spacing={1.5}>
              <BookingMobileList {...listProps} />
              <BookingDesktopTable {...listProps} />
            </Stack>
          )}
        </CardContent>
      </Card>
      <BookingCreateSheet
        bookingSettings={bookingSettings}
        bookingDate={state.bookingDateForCreate}
        isOpen={state.isCreateOpen}
        selectedDate={selectedDate}
        serviceId={state.serviceIdForCreate}
        services={services}
        onBookingDateChange={state.setBookingDateForCreate}
        onClose={() => state.setIsCreateOpen(false)}
        onCreate={async (payload) => {
          await onCreateBooking(payload)
          state.setIsCreateOpen(false)
        }}
        onServiceIdChange={state.setServiceIdForCreate}
      />
      <BookingEditSheet
        editDate={state.editDate}
        editNotes={state.editNotes}
        editServiceId={state.editServiceId}
        editingBooking={state.editingBooking}
        editSlotTime={state.editSlotTime}
        isSaving={state.isSaving}
        services={services}
        onClose={() => state.setEditingBooking(null)}
        onEditDateChange={state.setEditDate}
        onEditNotesChange={state.setEditNotes}
        onEditServiceIdChange={state.setEditServiceId}
        onEditSlotTimeChange={state.setEditSlotTime}
        onSave={state.handleSaveBooking}
      />
    </>
  )
}
