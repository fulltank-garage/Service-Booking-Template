import { expect, test } from '@playwright/test'

test('customer can complete a booking request', async ({ page }) => {
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
  await page.getByLabel('ชื่อผู้จอง').fill('สมชาย ใจดี')
  await page.getByLabel('เบอร์โทร').fill('0890000000')
  await page.getByRole('button', { name: /ยืนยันการจอง/ }).click()
  await expect(page.getByRole('heading', { name: 'จองคิวเรียบร้อย' })).toBeVisible()
})
