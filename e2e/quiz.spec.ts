import { test, expect } from '@playwright/test'

test('user can take a quiz and see result', async ({ page }) => {
  await page.goto('/signin')
  await page.getByLabel('Email').fill('employee@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard')

  await page.goto('/quizzes')
  await page.getByRole('link', { name: /Onboarding Quiz/i }).click()
  await page.waitForURL('**/quizzes/**')

  // Answer first question then keep clicking next until submit
  // TRUEFALSE / SINGLE default to first option selected
  const nextOrSubmit = page.getByRole('button', { name: /Next|Submit/ })
  const prev = page.getByRole('button', { name: 'Previous' })

  // Try clicking through; for multi types, select first two checkboxes
  for (let i = 0; i < 5; i++) {
    const radios = page.locator('input[type="radio"]')
    const checks = page.locator('input[type="checkbox"]')
    const text = page.locator('input[type="text"]')
    if (await radios.count()) await radios.first().check()
    if (await checks.count()) {
      await checks.nth(0).check()
      if ((await checks.count()) > 1) await checks.nth(1).check()
    }
    if (await text.count()) await text.fill('icecat')
    await nextOrSubmit.click()
  }

  await expect(page.getByText(/Results/)).toBeVisible()
  await expect(page.getByText(/Score:/)).toBeVisible()
})

