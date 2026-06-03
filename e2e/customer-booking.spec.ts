import { expect, test } from '@playwright/test'

test('customer can complete a booking request', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'จองคิว' })).toBeVisible()
  await expect(page.getByText('เลือกวันที่')).toBeVisible()
  await page.getByLabel('ชื่อผู้จอง').fill('สมชาย ใจดี')
  await page.getByLabel('เบอร์โทร').fill('0890000000')
  await page.getByRole('button', { name: /ยืนยันการจอง/ }).click()
  await expect(page.getByRole('heading', { name: 'จองคิวเรียบร้อย' })).toBeVisible()
})
