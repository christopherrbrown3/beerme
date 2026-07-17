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

test('a protected invite preserves its destination through login', async ({ page }) => {
  const token = '123e4567-e89b-42d3-a456-426614174000';
  await page.goto(`/join/${token}`);

  await expect(page).toHaveURL(/\/auth\/login\?next=/);
  expect(decodeURIComponent(page.url())).toContain(`/join/${token}`);
  await expect(page.getByRole('heading', { name: 'Sign in to your crew.' })).toBeVisible();
});

test('a new invitee keeps the destination when moving to signup', async ({ page }) => {
  const token = '123e4567-e89b-42d3-a456-426614174000';
  await page.goto(`/join/${token}`);
  await page.getByRole('link', { name: 'Create an account' }).click();

  await expect(page).toHaveURL(/\/auth\/signup\?next=/);
  expect(decodeURIComponent(page.url())).toContain(`/join/${token}`);
  await expect(page.getByRole('heading', { name: 'Create your BeerMe identity.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    `/auth/login?next=${encodeURIComponent(`/join/${token}`)}`,
  );
});

test('an unsafe stored Pages redirect cannot prevent app startup', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('beerme:redirect', '//example.com/steal'));
  await page.reload();

  await expect(page).toHaveURL(/\/auth\/login(?:\?next=%2F)?$/);
  await expect(page.getByRole('heading', { name: 'Sign in to your crew.' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('beerme:redirect'))).toBeNull();
});
