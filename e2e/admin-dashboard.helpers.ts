import { expect, type Page } from '@playwright/test'

export const mockService = {
  id: 'service-1',
  nameTh: 'บริการทดสอบ',
  nameEn: 'Test Service',
  descriptionTh: 'บริการสำหรับทดสอบ',
  durationMinutes: 30,
  priceCents: 50000,
  accentColor: '#FF008C',
  isActive: true,
}

export const mockBooking = {
  id: 'booking-1',
  bookingCode: 'SB-TEST-0001',
  serviceId: 'service-1',
  customerName: 'ลูกค้าทดสอบ',
  phone: '0890000000',
  bookingDate: '2026-06-10',
  slotTime: '10:00',
  status: 'pending',
  createdAt: '2026-06-10T03:00:00.000Z',
  service: mockService,
}

export async function expectBottomEditorSheet(page: Page, title: string) {
  const sheet = page.getByRole('dialog', { name: title })
  await expect(sheet).toBeVisible()
  const backdrop = page.locator('[data-testid="bottom-editor-backdrop"]')
  const backdropMetrics = await backdrop.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { backgroundColor: style.backgroundColor, backdropFilter: style.backdropFilter }
  })
  expect(backdropMetrics.backgroundColor).toBe('rgba(255, 255, 255, 0.72)')
  expect(backdropMetrics.backdropFilter).toContain('blur')
  const sheetMetrics = await sheet.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { borderTopWidth: style.borderTopWidth, borderRadius: style.borderRadius, boxShadow: style.boxShadow, transform: style.transform }
  })
  expect(sheetMetrics.borderTopWidth).toBe('1px')
  expect(sheetMetrics.borderRadius).toBe('19.2px')
  expect(sheetMetrics.boxShadow).toBe('none')
  expect(sheetMetrics.transform).not.toBe('none')
  await backdrop.click({ position: { x: 4, y: 4 } })
  await expect(sheet).toBeVisible()
}

export async function expectDropdownHasNoOverlay(page: Page) {
  const backdropMetrics = await page.locator('.MuiPopover-root .MuiBackdrop-root').evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { backgroundColor: style.backgroundColor, backdropFilter: style.backdropFilter }
  })
  expect(backdropMetrics.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(backdropMetrics.backdropFilter).toBe('none')
}

export async function setupAdminDashboardRoutes(page: Page) {
  await page.route('**/api/v1/admin/auth/login', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { email: 'admin@example.com', name: 'FULLTANK Garage Admin', token: 'e2e-token', expiresAt: new Date(Date.now() + 86_400_000).toISOString() } }),
    })
  })
  await page.route('**/api/v1/admin/bookings**', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [mockBooking] }) }))
  await page.route('**/api/v1/admin/notifications', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) }))
  await page.route('**/api/v1/admin/booking-settings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { openTime: '09:00', closeTime: '17:00', slotIntervalMinutes: 30, slotCapacity: 1, closedWeekdays: '', minAdvanceHours: 0, maxAdvanceDays: 60, reminderLeadMinutes: 1440, blackoutDates: [] } }),
    })
  })
  await page.route('**/api/v1/admin/services', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { ...mockService, id: 'service-2', nameTh: 'บริการใหม่' } }) })
      return
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [mockService] }) })
  })
  await page.route('**/api/v1/admin/push/public-key', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: false, publicKey: '' }) }))
}

export async function loginAdmin(page: Page) {
  await page.context().grantPermissions(['notifications'])
  await page.addInitScript(() => {
    if ('Notification' in window) Object.defineProperty(window.Notification, 'permission', { get: () => 'granted' })
  })
  await page.goto('/')
  await page.getByLabel('อีเมล').fill('admin@example.com')
  await page.getByLabel('รหัสผ่าน').fill('admin1234')
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
}

export async function openDashboardNav(page: Page, name: string, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await page.getByRole('button', { name }).click()
    return
  }
  await page.getByRole('button', { name }).click()
}
