import { expect, test } from '@playwright/test'

test('production booking route renders booking screen', async ({ page }) => {
  await page.goto('/booking')
  await expect(page.getByRole('heading', { name: 'จองคิว' })).toBeVisible()
  await expect(page.getByText('เลือกบริการของคุณ')).toBeVisible()
})

test('production services rich menu route renders shop services', async ({ page }) => {
  await page.goto('/?liff.state=%2Fservices')
  await expect(page.getByRole('heading', { name: 'บริการทางร้าน' })).toBeVisible()
})

test('production booking success rich menu route renders latest booking surface', async ({ page }) => {
  await page.goto('/?liff.state=%2Fbooking%2Fsuccess')
  await expect(page.getByRole('heading', { name: 'ข้อมูลการจอง' })).toBeVisible()
})
