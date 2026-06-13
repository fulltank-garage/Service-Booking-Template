import { expect, test } from '@playwright/test'
import { expectBottomEditorSheet, expectDropdownHasNoOverlay, loginAdmin, openDashboardNav, setupAdminDashboardRoutes } from './admin-dashboard.helpers'

test('admin dashboard loads booking and notification surfaces', async ({ page }, testInfo) => {
  await setupAdminDashboardRoutes(page)
  await loginAdmin(page)
  const isMobile = testInfo.project.name === 'mobile-chromium'

  if (isMobile) {
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
  if (isMobile) {
    await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await expect(page.getByRole('button', { name: 'รายการแจ้งเตือน' })).toBeVisible()
    await page.getByRole('button', { name: 'ปิดเมนู' }).click()
  } else {
    await expect(page.getByRole('button', { name: 'รายการแจ้งเตือน' })).toBeVisible()
  }

  await openDashboardNav(page, 'รายการจอง', isMobile)

  await expect(page.getByRole('heading', { name: 'รายการจอง' })).toBeVisible()
  if (isMobile) {
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

  await openDashboardNav(page, 'การตั้งค่าร้าน', isMobile)

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

  await openDashboardNav(page, 'บริการของร้าน', isMobile)

  await expect(page.getByPlaceholder('ค้นหาบริการ')).toBeVisible()
  await expect(page.getByRole('button', { name: 'เพิ่มบริการ' })).toBeVisible()
  await page.getByRole('button', { name: 'เพิ่มบริการ' }).click()
  await expectBottomEditorSheet(page, 'เพิ่มบริการ')
})
