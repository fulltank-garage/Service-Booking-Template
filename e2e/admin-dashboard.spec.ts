import { expect, test } from '@playwright/test'

test('admin dashboard loads booking and notification surfaces', async ({ page }, testInfo) => {
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

  await page.goto('/')
  await page.getByLabel('อีเมล').fill('admin@example.com')
  await page.getByLabel('รหัสผ่าน').fill('admin1234')
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.getByRole('heading', { name: 'แจ้งเตือนเมื่อมีคิวใหม่' })).toBeVisible()
    await page.getByRole('button', { name: 'ไว้ก่อน' }).click()
  }

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.getByRole('button', { name: 'เปิดเมนู' })).toBeVisible()
    await expect(page.locator('header').getByText('Booking Center')).toHaveCount(0)
    await expect(page.locator('header').getByText('จัดการคิวจองบริการ')).toBeVisible()
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await expect(page.locator('.MuiDrawer-paper').getByText('Booking Center')).toBeVisible()
    await expect(page.locator('.MuiDrawer-paper').getByText('FULLTANK Garage Admin')).toBeVisible()
    await page.getByRole('button', { name: 'ปิดเมนู' }).click()
  } else {
    await expect(page.getByText('จัดการคิวจองบริการ')).toBeVisible()
    await expect(page.locator('aside').getByText('FULLTANK Garage Admin')).toBeVisible()
  }
  await expect(page.getByText('คิวทั้งหมด')).toBeVisible()
  await expect(page.getByText('รายการจองล่าสุด')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'รายการแจ้งเตือน' })).toHaveCount(0)

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
