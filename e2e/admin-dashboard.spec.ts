import { expect, test } from '@playwright/test'

test('admin dashboard loads booking and notification surfaces', async ({ page }) => {
  await page.route('**/api/v1/admin/auth/login', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          email: 'admin@example.com',
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
  await expect(page.getByRole('heading', { name: 'จัดการคิวจองบริการ' })).toBeVisible()
  await expect(page.getByText('รายการจองล่าสุด')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'รายการแจ้งเตือน' })).toBeVisible()
})
