import { expect, test } from '@playwright/test'

test('admin dashboard loads booking and notification surfaces', async ({ page }, testInfo) => {
  const service = {
    id: 'service-1',
    nameTh: 'บริการทดสอบ',
    nameEn: 'Test Service',
    descriptionTh: 'บริการสำหรับทดสอบ',
    durationMinutes: 30,
    priceCents: 50000,
    accentColor: '#FF008C',
    isActive: true,
  }
  const booking = {
    id: 'booking-1',
    bookingCode: 'SB-TEST-0001',
    serviceId: 'service-1',
    customerName: 'ลูกค้าทดสอบ',
    phone: '0890000000',
    bookingDate: '2026-06-10',
    slotTime: '10:00',
    status: 'pending',
    createdAt: '2026-06-10T03:00:00.000Z',
    service,
  }

  await page.route('**/api/v1/admin/auth/login', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          email: 'admin@example.com',
          name: 'FULLTANK Garage Admin',
          token: 'e2e-token',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      }),
    })
  })
  await page.route('**/api/v1/admin/bookings**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [booking] }),
    })
  })
  await page.route('**/api/v1/admin/notifications', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })
  await page.route('**/api/v1/admin/booking-settings', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          openTime: '09:00',
          closeTime: '17:00',
          slotIntervalMinutes: 30,
          slotCapacity: 1,
          closedWeekdays: '',
          minAdvanceHours: 0,
          maxAdvanceDays: 60,
          reminderLeadMinutes: 1440,
          blackoutDates: [],
        },
      }),
    })
  })
  await page.route('**/api/v1/admin/services', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...service, id: 'service-2', nameTh: 'บริการใหม่' } }),
      })
      return
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [service] }),
    })
  })
  await page.route('**/api/v1/admin/push/public-key', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ configured: false, publicKey: '' }),
    })
  })

  await page.context().grantPermissions(['notifications'])
  await page.addInitScript(() => {
    if ('Notification' in window) {
      Object.defineProperty(window.Notification, 'permission', { get: () => 'granted' })
    }
  })
  await page.goto('/')
  await page.getByLabel('อีเมล').fill('admin@example.com')
  await page.getByLabel('รหัสผ่าน').fill('admin1234')
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.getByRole('button', { name: 'เปิดเมนู' })).toBeVisible()
    await expect(page.locator('header').getByAltText('BookingQueue logo')).toHaveCount(0)
    await expect(page.locator('header').getByText('รายการจอง')).toBeVisible()
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await expect(page.locator('.MuiDrawer-paper').getByAltText('BookingQueue logo')).toBeVisible()
    await expect(page.locator('.MuiDrawer-paper').getByText('FULLTANK Garage Admin')).toBeVisible()
    await page.getByRole('button', { name: 'ปิดเมนู' }).click()
  } else {
    await expect(page.getByRole('heading', { name: 'รายการจอง' })).toBeVisible()
    await expect(page.locator('aside').getByText('FULLTANK Garage Admin')).toBeVisible()
  }
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await expect(page.getByRole('button', { name: 'รายการแจ้งเตือน' })).toBeVisible()
    await page.getByRole('button', { name: 'ปิดเมนู' }).click()
  } else {
    await expect(page.getByRole('button', { name: 'รายการแจ้งเตือน' })).toBeVisible()
  }

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await page.getByRole('button', { name: 'รายการจอง' }).click()
  } else {
    await page.getByRole('button', { name: 'รายการจอง' }).click()
  }

  await expect(page.getByRole('heading', { name: 'รายการจอง' })).toBeVisible()
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.locator('p').filter({ hasText: 'ลูกค้าทดสอบ', visible: true })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: 'SB-TEST-0001', visible: true })).toBeVisible()
  } else {
    const bookingTable = page.getByRole('table', { name: 'booking table' })
    await expect(bookingTable.getByText('ลูกค้าทดสอบ')).toBeVisible()
    await expect(bookingTable.getByText('SB-TEST-0001')).toBeVisible()
  }

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await page.getByRole('button', { name: 'บริการของร้าน' }).click()
  } else {
    await page.getByRole('button', { name: 'บริการของร้าน' }).click()
  }

  await expect(page.getByPlaceholder('ค้นหาบริการ')).toBeVisible()
  await expect(page.getByRole('button', { name: 'เพิ่มบริการ' })).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มบริการ' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'เพิ่มบริการ' })).toBeVisible()
})
