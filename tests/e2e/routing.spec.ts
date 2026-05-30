import { test as base, expect } from '@playwright/test';
import { test } from './fixtures';

// ── Auth guards ──────────────────────────────────────────────────────────────

base.describe('Auth routing guards', () => {
  base.test('unauthenticated / → redirects to /login', async ({ page }) => {
    await page.goto('/#/');
    await expect(page).toHaveURL(/#\/login/);
  });

  base.test('unauthenticated /campus → redirects to /login', async ({ page }) => {
    await page.goto('/#/campus');
    await expect(page).toHaveURL(/#\/login/);
  });

  base.test('unauthenticated /espacos/:id/relatorio → redirects to /login', async ({ page }) => {
    await page.goto('/#/espacos/00000000-0000-0000-0000-000000000011/relatorio');
    await expect(page).toHaveURL(/#\/login/);
  });

  base.test('login page renders email + password inputs', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Entrar")')).toBeVisible();
  });
});

// ── Authenticated routing ────────────────────────────────────────────────────

test.describe('Authenticated routing', () => {
  test('student: / → redirects to /campus', async ({ studentPage: page }) => {
    await page.goto('/#/');
    await expect(page).toHaveURL(/#\/campus/);
  });

  test('student: guestOnly /login → redirects to /campus', async ({ studentPage: page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveURL(/#\/campus/);
  });

  test('student: /campus renders campus list', async ({ studentPage: page }) => {
    await page.goto('/#/campus');
    await expect(page.locator('body')).not.toContainText('Entrar');
    await expect(page.locator('body')).toContainText(/campus|Campus|Pici|Benfica/i);
  });

  test('student: /relatorios → redirects (role-gated)', async ({ studentPage: page }) => {
    // First navigate somewhere to ensure user is fully hydrated
    await page.goto('/#/campus');
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    // Now navigate to reports — guard fires with hydrated student role
    await page.goto('/#/relatorios');
    // Students not in CAN_VIEW_REPORTS → redirected to campus-select
    await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
  });

  test('staff: /relatorios → accessible', async ({ staffPage: page }) => {
    await page.goto('/#/relatorios');
    // Staff can view reports
    await expect(page).toHaveURL(/#\/relatorios/);
  });

  test('professor: /relatorios → accessible', async ({ professorPage: page }) => {
    await page.goto('/#/relatorios');
    await expect(page).toHaveURL(/#\/relatorios/);
  });

  test('new router type augmentation: /espacos/:id/relatorio route exists', async ({ professorPage: page }) => {
    await page.goto('/#/espacos/00000000-0000-0000-0000-000000000011/relatorio');
    await expect(page).toHaveURL(/#\/espacos\/.*\/relatorio/);
  });
});
