import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import type { Booking } from '../../types/booking'
import type { LineProfile } from '../../integrations/liff'
import { BookingCalendar } from './components/BookingCalendar'
import { BookingSectionHeading } from './components/BookingSectionHeading'
import { BookingSummaryPreview } from './components/BookingSummaryPreview'
import { BookingWizardSkeleton } from './components/BookingWizardSkeleton'
import { ConfirmedBookingCard } from './components/ConfirmedBookingCard'
import { ContactDetailsForm } from './components/ContactDetailsForm'
import { ServiceSelect } from './components/ServiceSelect'
import { TimeSlotPicker } from './components/TimeSlotPicker'
import { useBookingWizardState } from './hooks/useBookingWizardState'

type BookingWizardProps = {
  lineProfile: LineProfile | null
  onBookingConfirmed?: (booking: Booking) => void
}

export function BookingWizard({ lineProfile, onBookingConfirmed }: BookingWizardProps) {
  const wizard = useBookingWizardState({ lineProfile, onBookingConfirmed })

  if (wizard.showInitialSkeleton) return <BookingWizardSkeleton />

  if (wizard.confirmedBooking) {
    return <ConfirmedBookingCard booking={wizard.confirmedBooking} onCreateNew={() => wizard.setConfirmedBooking(null)} />
  }

  return (
    <Card
      data-testid="booking-wizard"
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>
              จองคิว
            </Typography>
            <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>เลือกบริการ วันเวลา แล้วกรอกเบอร์โทร</Typography>
          </Box>

          {wizard.error && (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              {wizard.error}
            </Alert>
          )}

          <BookingSectionHeading step={1} title="เลือกบริการที่ต้องการ" />
          <ServiceSelect
            isLoading={wizard.isLoadingServices}
            selectedServiceId={wizard.selectedServiceId}
            services={wizard.services}
            onChange={wizard.setSelectedServiceId}
          />

          <BookingSectionHeading step={2} title="เลือกวันและเวลา" />
          <BookingCalendar
            blackoutDates={wizard.blackoutDates}
            bookingDate={wizard.bookingDate}
            closedWeekdays={wizard.closedWeekdays}
            maxDateKey={wizard.maxDateKey}
            todayKey={wizard.todayKey}
            visibleMonth={wizard.visibleMonth}
            onMonthChange={wizard.setVisibleMonth}
            onSelectDate={wizard.setBookingDate}
          />
          <TimeSlotPicker
            isLoadingSlots={wizard.isLoadingSlots}
            selectedServiceId={wizard.selectedServiceId}
            selectedSlot={wizard.selectedSlot}
            slots={wizard.slots}
            onSelectSlot={wizard.setSelectedSlot}
          />

          <BookingSectionHeading step={3} title="กรอกข้อมูลติดต่อ" />
          <ContactDetailsForm
            customerName={wizard.customerName}
            hasLineDisplayName={Boolean(lineProfile?.displayName)}
            notes={wizard.notes}
            phone={wizard.phone}
            onManualCustomerNameChange={wizard.setManualCustomerName}
            onNotesChange={wizard.setNotes}
            onPhoneChange={wizard.setPhone}
          />

          <BookingSummaryPreview
            phone={wizard.phone}
            selectedService={wizard.selectedService}
            bookingDate={wizard.bookingDate}
            selectedSlot={wizard.selectedSlot}
          />

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!wizard.canSubmit || wizard.isSubmitting}
              onClick={wizard.handleSubmit}
              sx={{ minHeight: 58, fontSize: '1.1rem', py: 1.5 }}
            >
              {wizard.isSubmitting ? 'กำลังส่ง...' : 'จองคิว'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
