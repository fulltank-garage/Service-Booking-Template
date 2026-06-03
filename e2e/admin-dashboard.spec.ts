import { expect, test } from '@playwright/test'

test('admin dashboard loads booking and notification surfaces', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'จัดการคิวจองบริการ' })).toBeVisible()
  await expect(page.getByText('รายการจองล่าสุด')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Notification' })).toBeVisible()
})
