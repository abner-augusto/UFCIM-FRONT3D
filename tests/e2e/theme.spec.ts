import { test as base, expect } from '@playwright/test';
import { test } from './fixtures';

test.use({ hasTouch: true });

base('applies the system theme before the application bundle', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.route('**/src/main.ts', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('theme button has an accessible label and a 44px touch target', async ({ studentPage: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/campus');
  const button = page.getByRole('button', { name: /Ativar tema (claro|escuro)/ });
  await expect(button).toBeVisible();
  await expect(button).not.toHaveAttribute('aria-pressed');
  const size = await button.boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(44);
  expect(size?.height).toBeGreaterThanOrEqual(44);
});
