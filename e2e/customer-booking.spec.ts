import { expect, test } from '@playwright/test'

test('customer can complete a booking request', async ({ page }) => {
  await page.route('**/api/v1/booking-rules', async (route) => {
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
  await page.route('**/api/v1/services', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'service-1',
            nameTh: 'บริการทดสอบ',
            nameEn: 'Test Service',
            descriptionTh: 'บริการสำหรับทดสอบ',
            durationMinutes: 30,
            priceCents: 0,
            accentColor: '#FF008C',
            isActive: true,
          },
        ],
      }),
    })
  })
  await page.route('**/api/v1/availability**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { time: '10:00', booked: 0, capacity: 1, available: true },
          { time: '10:30', booked: 1, capacity: 1, available: false },
        ],
      }),
    })
  })
  await page.route('**/api/v1/bookings', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'booking-1',
          bookingCode: 'SB-TEST-0001',
          serviceId: 'service-1',
          customerName: 'สมชาย ใจดี',
          phone: '0890000000',
          bookingDate: '2026-06-10',
          slotTime: '10:00',
          status: 'pending',
          createdAt: '2026-06-10T03:00:00.000Z',
        },
      }),
    })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'จองคิว' })).toBeVisible()
  await expect(page.getByText('เลือกวันที่')).toBeVisible()
  await expect(page.getByText('เลือกบริการของคุณ')).toBeVisible()
  const serviceControlMetrics = await page.evaluate(() => {
    const serviceSelect = document.querySelector('[aria-label="บริการ"]')?.closest('.MuiOutlinedInput-root')
    const toMetrics = (element?: Element | null) => {
      const rect = element?.getBoundingClientRect()
      const style = element ? window.getComputedStyle(element) : null
      return {
        height: rect?.height ?? 0,
        borderRadius: style?.borderRadius ?? '',
      }
    }
    return toMetrics(serviceSelect)
  })
  expect(serviceControlMetrics.height).toBe(56)
  expect(serviceControlMetrics.borderRadius).toBe('12px')
  await page.getByLabel('บริการ').click()
  const serviceMenuMetrics = await page.locator('.MuiMenu-paper').evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      borderTopWidth: style.borderTopWidth,
      borderRadius: style.borderRadius,
    }
  })
  expect(serviceMenuMetrics.borderTopWidth).toBe('1px')
  expect(serviceMenuMetrics.borderRadius).toBe('12px')
  await page.getByRole('option', { name: 'บริการทดสอบ' }).click()
  await expect(page.getByLabel('ชื่อผู้จองจาก LINE')).toHaveValue('สมชาย ใจดี')
  await page.getByLabel('เบอร์โทร').fill('0890000000')
  await page.getByRole('button', { name: /ยืนยันการจอง/ }).click()
  await expect(page).toHaveURL(/\/booking\/success$/)
  await expect(page.getByRole('heading', { name: 'ข้อมูลการจอง' })).toBeVisible()
  await expect(page.getByText('SB-TEST-0001')).toBeVisible()
})

test('customer can view shop services from the rich menu route', async ({ page }) => {
  await page.route('**/api/v1/services', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'service-1',
            nameTh: 'ทำเล็บเจลสีพื้น',
            nameEn: 'Gel Color',
            descriptionTh: 'ทาเล็บเจลสีพื้น เลือกสีได้ตามต้องการ',
            durationMinutes: 45,
            priceCents: 35000,
            accentColor: '#FF008C',
            isActive: true,
          },
        ],
      }),
    })
  })

  await page.goto('/services')
  await expect(page.getByRole('heading', { name: 'บริการทางร้าน' })).toBeVisible()
  await expect(page.getByText('ทำเล็บเจลสีพื้น')).toBeVisible()
  await expect(page.getByText('350 บาท')).toBeVisible()
})
