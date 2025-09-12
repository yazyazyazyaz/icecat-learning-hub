import { test, expect } from '@playwright/test'

test('user can sign in, open a lesson, mark done', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByLabel('Email').fill('employee@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL('**/dashboard')
  // Open first onboarding lesson
  await page.getByRole('link', { name: /Company Introduction/i }).first().click()
  await page.waitForURL('**/lessons/**')
  // Toggle mark as done
  const btn = page.getByRole('button', { name: /Mark as done|Completed/ })
  await btn.click()
  await expect(page.getByRole('button', { name: 'Completed' })).toBeVisible()
})

