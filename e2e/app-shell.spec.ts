import { expect, test } from '@playwright/test';

test('primary navigation keeps the shell responsive and usable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeVisible();
  await page.getByRole('link', { name: 'Activity' }).click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  await page.getByRole('link', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
});

test('the app exposes installable PWA metadata', async ({ page, request }) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const manifestResponse = await request.get(manifestHref!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as { name: string; display: string };
  expect(manifest).toMatchObject({ name: 'BeerMe', display: 'standalone' });
});
