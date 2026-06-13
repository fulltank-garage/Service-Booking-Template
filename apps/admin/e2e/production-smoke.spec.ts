import { expect, test } from '@playwright/test'

test('production admin login page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('อีเมล')).toBeVisible()
  await expect(page.getByLabel('รหัสผ่าน')).toBeVisible()
})

test('production admin can authenticate and render realtime surfaces', async ({ page }, testInfo) => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  test.skip(!email || !password, 'Set ADMIN_EMAIL and ADMIN_PASSWORD to run authenticated production smoke.')

  await page.goto('/')
  await page.getByLabel('อีเมล').fill(email)
  await page.getByLabel('รหัสผ่าน').fill(password)
  await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()

  await expect(page.getByText('จัดการคิวจองบริการ')).toBeVisible()

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await expect(page.locator('.MuiDrawer-paper').getByText(/เชื่อมต่อ|ข้อมูลสด|อัปเดต/)).toBeVisible()
  } else {
    await expect(page.locator('aside').getByText(/เชื่อมต่อ|ข้อมูลสด|อัปเดต/)).toBeVisible()
  }
})
