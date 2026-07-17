import { expect, test } from '@playwright/test';

test('signed-out visitors can move between login and signup', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Sign in to your crew.' })).toBeVisible();
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByRole('heading', { name: 'Create your BeerMe identity.' })).toBeVisible();
  await expect(page.getByLabel('Username')).toHaveAttribute('maxlength', '24');
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
