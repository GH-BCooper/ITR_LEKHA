import { expect, test } from '@playwright/test';

const routes = ['/', '/compare', '/reconcile', '/methodology', '/missing-route'];
test('routes resolve and links never use dead targets', async ({ page, request }) => {
  for (const route of routes) { const response = await request.get(route); expect(response?.status()).toBeLessThan(500); await page.goto(route); const links = await page.locator('a').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href'))); for (const href of links) expect(href).not.toMatch(/^(#|$|javascript:void\(0\))$/); }
});

test('interactive controls change visible state', async ({ page }) => {
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Continue' }).click(); await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click(); await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Reset everything' }).click(); await expect(page.getByText('Clear every input?')).toBeVisible();
  await page.goto('/reconcile');
  await page.getByRole('button', { name: 'Load sample' }).first().click(); await expect(page.getByRole('status')).toContainText('loaded');
});
