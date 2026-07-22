import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const MINIMUM_TOUCH_TARGET = 44;
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

async function expectNoBlockingAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations
    .filter((violation) => violation.impact && BLOCKING_IMPACTS.has(violation.impact))
    .flatMap((violation) =>
      violation.nodes.map((node) => ({
        rule: violation.id,
        impact: violation.impact,
        help: violation.help,
        target: node.target.join(' '),
        helpUrl: violation.helpUrl,
      })),
    );

  expect(blocking).toEqual([]);
}

async function expectTouchTargetBudget(page: Page) {
  const failures = await page
    .locator('button, input:not([type="hidden"]), select, textarea, .back-link, .bottom-nav__item')
    .evaluateAll(
      (elements, minimum) =>
        elements.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          if (style.visibility === 'hidden' || style.display === 'none' || rect.width === 0)
            return [];
          if (rect.width >= minimum && rect.height >= minimum) return [];

          return [
            {
              element: element.outerHTML.slice(0, 180),
              width: Math.round(rect.width * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
            },
          ];
        }),
      MINIMUM_TOUCH_TARGET,
    );

  expect(failures).toEqual([]);
}

for (const route of ['/auth/login', '/auth/signup']) {
  test(`${route} has no blocking accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();

    await expectNoBlockingAccessibilityViolations(page);
    await expectTouchTargetBudget(page);
  });
}

test('signup preserves keyboard order and exposes validation errors', async ({ page }) => {
  await page.goto('/auth/signup');

  const username = page.locator('#username');
  const displayName = page.locator('#display-name');
  const password = page.locator('#password');

  await username.focus();
  await expect(username).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(displayName).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeFocused();

  await username.fill('ab');
  await username.blur();
  await expect(username).toHaveAttribute('aria-invalid', 'true');
  await expect(username).toHaveAccessibleDescription(
    'Use 3–24 lowercase letters, numbers, or underscores.',
  );
});

test('login keeps username semantics when an empty password is submitted', async ({ page }) => {
  let authRequests = 0;
  await page.route('**/auth/v1/token**', async (route) => {
    authRequests += 1;
    await route.abort();
  });
  await page.goto('/auth/login');

  const username = page.locator('#username');
  const password = page.locator('#password');
  await username.fill('friend_1');
  await page.locator('form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAccessibleDescription('Enter your password.');
  await expect(username).toHaveValue('friend_1');
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/auth\/login$/);
  expect(authRequests).toBe(0);
});

test('reduced-motion preference collapses animation and transition durations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/auth/signup');

  const excessiveDurations = await page.locator('body *').evaluateAll((elements) => {
    function milliseconds(duration: string) {
      return duration
        .split(',')
        .map((value) => value.trim())
        .map((value) =>
          value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000,
        );
    }

    return elements.flatMap((element) => {
      const style = window.getComputedStyle(element);
      const animation = Math.max(...milliseconds(style.animationDuration));
      const transition = Math.max(...milliseconds(style.transitionDuration));
      if (animation <= 0.01 && transition <= 0.01) return [];

      return [
        {
          element: element.outerHTML.slice(0, 180),
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration,
        },
      ];
    });
  });

  expect(excessiveDurations).toEqual([]);
});
