import { Box, Stack } from '@mui/material'
import { adminApi } from '../../api/adminApi'
import { addDaysToISODate } from '../../utils/dateFormat'
import type { BookingStatus } from '../../types/admin'
import { PushNotificationPrompt } from '../notifications/PushNotificationPrompt'
import { MOBILE_TOPBAR_OFFSET } from './constants/dashboardOptions'
import { AdminTopbar } from './components/AdminTopbar'
import { AppNoticeSnackbar } from './components/AppNoticeSnackbar'
import { MobileNavDrawer, Sidebar } from './components/DashboardNavigation'
import { OverviewPage } from './components/OverviewPage'
import { QuickStartNudge, SetupChecklistPage } from './components/SetupChecklistPage'
import { NotificationsPage } from './components/NotificationsPage'
import { BookingSettingsPage } from './components/BookingSettingsPage'
import { BookingsPage } from './components/BookingsPage'
import { ServicesPage } from './components/ServicesPage'
import { DashboardSkeleton } from './components/dashboardSkeletons'
import { useDashboardController } from './hooks/useDashboardController'

type DashboardPageProps = { adminEmail: string; adminName: string; applyAppUpdate: () => void; hasPendingAppUpdate: boolean; onLogout: () => void }

export function DashboardPage({ adminEmail, adminName, applyAppUpdate, hasPendingAppUpdate, onLogout }: DashboardPageProps) {
  const {
    activePage, isNavOpen, isSimpleMode, bookings, services, notifications,
    bookingSettings, dailySummary, pushHealth, selectedBookingDate, bookingQuery,
    bookingStatusFilter, isLoading, shouldShowDataSkeleton, realtimeStatus,
    latestRealtimeAt, notice, setNotice, setIsNavOpen, setSelectedBookingDate,
    setBookingQuery, setBookingStatusFilter, setServices, setNotifications,
    setBookingSettings, summary, setupProgress, handleCompleteDemoBooking,
    handleStatusChange, handleDeleteBooking, handleUpdateBooking,
    handleCreateBooking, handleExportBookings, handleChangePage,
  } = useDashboardController(hasPendingAppUpdate)

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AdminTopbar
        activePage={activePage}
        hasPendingAppUpdate={hasPendingAppUpdate}
        onOpenNav={() => setIsNavOpen(true)}
      />
      <MobileNavDrawer
          activePage={activePage}
          adminEmail={adminEmail}
          adminName={adminName}
          hasPendingAppUpdate={hasPendingAppUpdate}
          latestRealtimeAt={latestRealtimeAt}
          open={isNavOpen}
          realtimeStatus={realtimeStatus}
          setupTodoCount={setupProgress.total - setupProgress.doneCount}
          simpleMode={isSimpleMode}
          unreadCount={summary.unread}
          onApplyAppUpdate={applyAppUpdate}
          onChangePage={handleChangePage}
          onClose={() => setIsNavOpen(false)}
          onLogout={onLogout}
      />

      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ minHeight: '100dvh', pt: { xs: MOBILE_TOPBAR_OFFSET, lg: 0 } }}>
        <Sidebar
          activePage={activePage}
          adminEmail={adminEmail}
          adminName={adminName}
          hasPendingAppUpdate={hasPendingAppUpdate}
          latestRealtimeAt={latestRealtimeAt}
          realtimeStatus={realtimeStatus}
          setupTodoCount={setupProgress.total - setupProgress.doneCount}
          simpleMode={isSimpleMode}
          unreadCount={summary.unread}
          onApplyAppUpdate={applyAppUpdate}
          onChangePage={handleChangePage}
          onLogout={onLogout}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2.5, sm: 2.5, lg: 2.5 },
            pt: { xs: 2.5, sm: 2.5, lg: '92px' },
            pb: { xs: 2.5, sm: 2.5, lg: 2.5 },
          }}
        >
          <Stack spacing={2.5}>
            <PushNotificationPrompt onNotice={setNotice} />

            {isLoading && !shouldShowDataSkeleton ? null : shouldShowDataSkeleton ? (
              <DashboardSkeleton activePage={activePage} />
            ) : (
              <>
                {activePage === 'setup' && (
                  <SetupChecklistPage
                    progress={setupProgress}
                    pushHealth={pushHealth}
                    onChangePage={handleChangePage}
                    onCompleteDemoBooking={handleCompleteDemoBooking}
                  />
                )}
                {activePage === 'overview' && (
                  <OverviewPage dailySummary={dailySummary} summary={summary} />
                )}
                {activePage === 'bookings' && (
                  <>
                  {setupProgress.doneCount < setupProgress.total && (
                    <QuickStartNudge
                      progress={setupProgress}
                      onChangePage={handleChangePage}
                      onCompleteDemoBooking={handleCompleteDemoBooking}
                    />
                  )}
	                  <BookingsPage
	                    bookingSettings={bookingSettings}
	                    bookings={bookings}
	                    query={bookingQuery}
	                    selectedDate={selectedBookingDate}
	                    services={services}
	                    simpleMode={isSimpleMode}
	                    statusFilter={bookingStatusFilter}
	                    onCreateBooking={handleCreateBooking}
	                    onDeleteBooking={handleDeleteBooking}
	                    onExportBookings={handleExportBookings}
	                    onQueryChange={setBookingQuery}
	                    onNextDay={() => setSelectedBookingDate((date) => addDaysToISODate(date, 1))}
	                    onPreviousDay={() => setSelectedBookingDate((date) => addDaysToISODate(date, -1))}
	                    onStatusFilterChange={setBookingStatusFilter}
	                    onStatusChange={handleStatusChange}
	                    onUpdateBooking={handleUpdateBooking}
	                  />
                  </>
                )}
                {activePage === 'services' && (
                  <ServicesPage
                    services={services}
                    onAddService={async (payload) => {
                      const service = await adminApi.createService(payload)
                      setServices((current) => [service, ...current])
                      setNotice('เพิ่มบริการของร้านแล้ว')
                    }}
                    onDeleteService={async (serviceId) => {
                      await adminApi.deleteService(serviceId)
                      setServices((current) => current.filter((service) => service.id !== serviceId))
                      setNotice('ลบบริการของร้านแล้ว')
                    }}
                    onUpdateService={async (serviceId, payload) => {
                      const nextService = await adminApi.updateService(serviceId, payload)
                      setServices((current) => current.map((service) => (service.id === nextService.id ? nextService : service)))
                      setNotice('แก้ไขบริการของร้านแล้ว')
                    }}
                    onError={() => setNotice('บันทึกข้อมูลบริการไม่สำเร็จ')}
                  />
                )}
                {activePage === 'notifications' && (
                  <NotificationsPage
                    notifications={notifications}
                    pushHealth={pushHealth}
                    simpleMode={isSimpleMode}
                    onError={() => setNotice('อัปเดตแจ้งเตือนไม่สำเร็จ')}
                    onMarkAllRead={async () => {
                      const unreadNotifications = notifications.filter((notification) => !notification.isRead)
                      const updatedItems = await Promise.all(
                        unreadNotifications.map((notification) => adminApi.markNotificationRead(notification.id)),
                      )
                      setNotifications((current) =>
                        current.map((notification) => updatedItems.find((item) => item.id === notification.id) ?? notification),
                      )
                      setNotice('อ่านแจ้งเตือนทั้งหมดแล้ว')
                    }}
                    onMarkRead={async (notificationId) => {
                      const item = await adminApi.markNotificationRead(notificationId)
                      setNotifications((current) =>
                        current.map((notification) => (notification.id === item.id ? item : notification)),
                      )
                      setNotice('อ่านแจ้งเตือนแล้ว')
                    }}
                  />
                )}
                {activePage === 'settings' && (
                  <BookingSettingsPage
                    key={bookingSettings ? JSON.stringify(bookingSettings) : 'empty-booking-settings'}
                    settings={bookingSettings}
                    onSave={async (payload) => {
                      const nextSettings = await adminApi.updateBookingSettings(payload)
                      setBookingSettings(nextSettings)
                      setNotice('บันทึกการตั้งค่าร้านแล้ว')
                    }}
                    onError={() => setNotice('บันทึกการตั้งค่าร้านไม่สำเร็จ')}
                  />
                )}
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      <AppNoticeSnackbar message={notice} onClose={() => setNotice('')} />
    </Box>
  )
}
