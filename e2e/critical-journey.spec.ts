import { expect, type Page, test } from '@playwright/test';

import { deleteLocalTestUsers } from './local-supabase';

const localSupabaseEnabled = process.env.E2E_LOCAL_SUPABASE === 'true';
test.use({ trace: 'off' });

async function signUp(page: Page, username: string, password: string) {
  await page.goto('/auth/signup');
  await page.locator('#username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeVisible();
}

test.describe('isolated authenticated journeys', () => {
  test.skip(!localSupabaseEnabled, 'Start local Supabase and use npm run test:e2e:local.');

  test('signup, ledger lifecycle, membership, and cleanup', async ({ browser, page }) => {
    test.setTimeout(120_000);
    const runId = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
    const ownerUsername = `e2e_${runId}_o`;
    const memberUsername = `e2e_${runId}_m`;
    const password = `${crypto.randomUUID()}Aa9!`;
    const groupName = `E2E crew ${runId}`;
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();

    try {
      await signUp(page, ownerUsername, password);

      await page.reload();
      await expect(page.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeVisible();

      await page.getByRole('link', { name: 'Profile' }).click();
      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page.getByRole('heading', { name: 'Sign in to your crew.' })).toBeVisible();
      await page.locator('#username').fill(ownerUsername);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/\/profile$/);
      await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Groups' }).click();
      await expect(page.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeVisible();

      await page.getByRole('button', { name: 'Create group' }).click();
      const createDialog = page.getByRole('dialog', { name: 'Create a group' });
      await createDialog.getByLabel('Group name').fill(groupName);
      await createDialog.getByLabel('Description Optional').fill('Synthetic browser test data');
      await createDialog.getByRole('button', { name: 'Create group' }).click();
      await page.getByRole('link', { name: new RegExp(groupName) }).click();
      await expect(page.getByRole('heading', { name: groupName })).toBeVisible();

      await page.getByRole('button', { name: 'IOU unit' }).click();
      const currencyDialog = page.getByRole('dialog', { name: 'Ledger unit' });
      await currencyDialog.getByRole('button', { name: 'Coffee' }).click();
      await currencyDialog.getByRole('button', { name: 'Save unit' }).click();
      await expect(page.getByText('☕ Coffees', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Invite' }).click();
      const inviteDialog = page.getByRole('dialog', {
        name: `Invite friends to ${groupName}`,
      });
      const inviteUrl = await inviteDialog.getByLabel('Invite link').inputValue();
      await inviteDialog.getByRole('button', { name: 'Close dialog' }).click();

      await memberPage.goto(inviteUrl);
      await memberPage.getByRole('link', { name: 'Create an account' }).click();
      await memberPage.locator('#username').fill(memberUsername);
      await memberPage.getByLabel('Password').fill(password);
      await memberPage.getByRole('button', { name: 'Create account' }).click();
      await expect(memberPage.getByRole('heading', { name: 'Confirm your invite.' })).toBeVisible();
      await memberPage.getByRole('button', { name: 'Join group' }).click();
      await expect(memberPage.getByRole('heading', { name: groupName })).toBeVisible();

      await page.reload();
      await expect(page.getByLabel('2 members')).toBeVisible();
      await page.getByRole('button', { name: 'Add transaction' }).click();
      const transactionDialog = page.getByRole('dialog', { name: 'Add to the ledger' });
      await transactionDialog.getByLabel('Who owes?').selectOption({ label: memberUsername });
      await transactionDialog.getByLabel('Who is owed?').selectOption({ label: ownerUsername });
      await transactionDialog.getByLabel('Quantity').fill('2');
      await transactionDialog.getByLabel('Note Optional').fill('Synthetic coffee');
      await transactionDialog.getByRole('button', { name: 'Add transaction' }).click();

      await page.getByRole('button', { name: 'History' }).click();
      const transaction = page.locator('.transaction-card').filter({ hasText: 'Synthetic coffee' });
      await expect(transaction).toContainText(`${memberUsername} owes ${ownerUsername} 2 Coffees`);
      await transaction.getByRole('button', { name: 'Reverse' }).click();
      const reverseDialog = page.getByRole('dialog', { name: 'Reverse transaction?' });
      await reverseDialog.getByRole('button', { name: 'Reverse transaction' }).click();
      await expect(transaction.getByText('Reversed')).toBeVisible();

      await page.getByRole('button', { name: 'IOU unit' }).click();
      const customCurrencyDialog = page.getByRole('dialog', { name: 'Ledger unit' });
      await customCurrencyDialog.getByRole('button', { name: 'Custom' }).click();
      await customCurrencyDialog.getByLabel('Singular').fill('Token');
      await customCurrencyDialog.getByLabel('Plural').fill('Tokens');
      await customCurrencyDialog.getByLabel('Symbol').fill('🪙');
      await customCurrencyDialog.getByRole('button', { name: 'Save unit' }).click();
      await expect(page.getByText('🪙 Tokens', { exact: true })).toBeVisible();

      await memberPage.getByRole('button', { name: 'Leave group' }).click();
      const leaveDialog = memberPage.getByRole('dialog', { name: 'Leave this group?' });
      await leaveDialog.getByRole('button', { name: 'Leave group' }).click();
      await expect(
        memberPage.getByRole('heading', { name: 'Good friends. Clear tabs.' }),
      ).toBeVisible();
      await expect(memberPage.getByRole('link', { name: new RegExp(groupName) })).toHaveCount(0);

      await page.getByRole('button', { name: 'Delete group' }).click();
      const deleteDialog = page.getByRole('dialog', { name: 'Delete this group?' });
      await deleteDialog.getByLabel(`Enter “${groupName}” to confirm`).fill(groupName);
      await deleteDialog.getByRole('button', { name: 'Delete group' }).click();
      await expect(page.getByRole('heading', { name: 'Good friends. Clear tabs.' })).toBeVisible();
      await expect(page.getByRole('link', { name: new RegExp(groupName) })).toHaveCount(0);
    } finally {
      await memberContext.close();
      await deleteLocalTestUsers([ownerUsername, memberUsername]);
    }
  });
});
