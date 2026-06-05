import { expect, test } from '@playwright/test'

const expectBottomEditorSheet = async (page: import('@playwright/test').Page, title: string) => {
  const sheet = page.getByRole('dialog', { name: title })
  await expect(sheet).toBeVisible()
  const backdrop = page.locator('[data-testid="bottom-editor-backdrop"]')
  const backdropMetrics = await backdrop.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      backgroundColor: style.backgroundColor,
      backdropFilter: style.backdropFilter,
    }
  })
  expect(backdropMetrics.backgroundColor).toBe('rgba(255, 255, 255, 0.72)')
  expect(backdropMetrics.backdropFilter).toContain('blur')
  const sheetMetrics = await sheet.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      borderTopWidth: style.borderTopWidth,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      transform: style.transform,
    }
  })
  expect(sheetMetrics.borderTopWidth).toBe('1px')
  expect(sheetMetrics.borderRadius).toBe('19.2px')
  expect(sheetMetrics.boxShadow).toBe('none')
  expect(sheetMetrics.transform).not.toBe('none')
  await backdrop.click({ position: { x: 4, y: 4 } })
  await expect(sheet).toBeVisible()
}

const expectDropdownHasNoOverlay = async (page: import('@playwright/test').Page) => {
  const backdropMetrics = await page.locator('.MuiPopover-root .MuiBackdrop-root').evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      backgroundColor: style.backgroundColor,
      backdropFilter: style.backdropFilter,
    }
  })
  expect(backdropMetrics.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(backdropMetrics.backdropFilter).toBe('none')
}

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
  await page.getByRole('button', { name: 'แก้ไข' }).click()
  await expectBottomEditorSheet(page, 'แก้ไขรายการจอง')
  const editBookingSheet = page.getByRole('dialog', { name: 'แก้ไขรายการจอง' })
  await expect(editBookingSheet.getByLabel('ชื่อผู้จอง')).toBeDisabled()
  await expect(editBookingSheet.getByLabel('เบอร์โทร')).toBeDisabled()
  await expect(editBookingSheet.getByLabel('เวลา')).toBeVisible()
  await expect(editBookingSheet.getByLabel('สถานะ')).toHaveCount(0)
  await expect(editBookingSheet.getByRole('button', { name: 'บันทึก' })).toBeVisible()
  await expect(editBookingSheet.getByRole('button', { name: 'ยืนยัน' })).toHaveCount(0)
  await expect(editBookingSheet.getByRole('button', { name: 'ยกเลิก' })).toHaveCount(0)
  await editBookingSheet.getByRole('button', { name: 'ปิด' }).click()

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await page.getByRole('button', { name: 'การตั้งค่าร้าน' }).click()
  } else {
    await page.getByRole('button', { name: 'การตั้งค่าร้าน' }).click()
  }

  await expect(page.getByText('เวลาเปิดร้าน')).toBeVisible()
  const openTimeSelect = page.getByLabel('เวลาเปิดร้าน')
  const closeTimeSelect = page.getByLabel('เวลาปิดร้าน')
  await expect(openTimeSelect).toBeVisible()
  await expect(closeTimeSelect).toBeVisible()
  await expect(page.getByLabel('ช่างกี่คน')).toBeVisible()
  const settingControlMetrics = await page.evaluate(() => {
    const getSelectRoot = (label: string) => document.querySelector(`[aria-label="${label}"]`)?.closest('.MuiOutlinedInput-root')
    const getTextFieldRoot = (label: string) => {
      const input = [...document.querySelectorAll('input')].find(
        (element) => element.getAttribute('aria-label') === label || Boolean(element.labels?.[0]?.textContent?.includes(label)),
      )
      return input?.closest('.MuiOutlinedInput-root')
    }
    const toMetrics = (element?: Element | null) => {
      const rect = element?.getBoundingClientRect()
      const style = element ? window.getComputedStyle(element) : null
      return {
        height: rect?.height ?? 0,
        borderRadius: style?.borderRadius ?? '',
      }
    }
    return {
      open: toMetrics(getSelectRoot('เวลาเปิดร้าน')),
      close: toMetrics(getSelectRoot('เวลาปิดร้าน')),
      capacity: toMetrics(getTextFieldRoot('ช่างกี่คน')),
    }
  })
  expect(settingControlMetrics.open.height).toBe(settingControlMetrics.capacity.height)
  expect(settingControlMetrics.close.height).toBe(settingControlMetrics.capacity.height)
  expect(settingControlMetrics.open.borderRadius).toBe(settingControlMetrics.capacity.borderRadius)
  expect(settingControlMetrics.close.borderRadius).toBe(settingControlMetrics.capacity.borderRadius)
  await openTimeSelect.click()
  await expect(page.getByRole('option', { name: '09:30' })).toBeVisible()
  await expectDropdownHasNoOverlay(page)
  await page.keyboard.press('Escape')

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await page.getByRole('button', { name: 'บริการของร้าน' }).click()
  } else {
    await page.getByRole('button', { name: 'บริการของร้าน' }).click()
  }

  await expect(page.getByPlaceholder('ค้นหาบริการ')).toBeVisible()
  await expect(page.getByRole('button', { name: 'เพิ่มบริการ' })).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มบริการ' }).click()
  await expectBottomEditorSheet(page, 'เพิ่มบริการ')
})
