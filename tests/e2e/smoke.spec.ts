import { expect, test } from '@playwright/test';

test('persona comparison, reconciliation and export work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Load Rohan' }).click();
  await expect(page.getByRole('heading', { name: 'Regime comparison' })).toBeVisible();
  await expect(page.locator('.ledger').first()).toContainText('₹');
  const slider = page.getByLabel('Explore old-regime deductions');
  await slider.press('ArrowRight');
  await expect(page.getByText('At the explored amount')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download summary' }).click();
  await download;
  await page.goto('/reconcile');
  await page.getByRole('button', { name: 'Load sample' }).nth(0).click();
  await page.getByRole('button', { name: 'Load sample' }).nth(1).click();
  await expect(page.getByRole('heading', { name: 'BLOCKERs (4)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'WARNINGs (2)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'INFOs (1)' })).toBeVisible();
});
