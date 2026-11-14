import { test as base, expect } from '@playwright/test';
import { test } from './fixtures';

const REPORT_SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';

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
    await page.goto(`/#/espacos/${REPORT_SPACE_ID}/relatorio`);
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

  test('student: /espacos/:id/relatorio → redirects (role-gated)', async ({ studentPage: page }) => {
    // Ensure the student role is hydrated before the guard fires
    await page.goto('/#/campus');
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    // Per-space report is gated by CAN_VIEW_REPORTS — students are redirected
    await page.goto(`/#/espacos/${REPORT_SPACE_ID}/relatorio`);
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
    await page.goto(`/#/espacos/${REPORT_SPACE_ID}/relatorio`);
    await expect(page).toHaveURL(/#\/espacos\/.*\/relatorio/);
  });

  test('cold deep-link: student → /manutencao/chamados redirects to /campus', async ({ studentPage: page }) => {
    await page.goto('/#/manutencao/chamados');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 10000 });
  });

  test('cold deep-link: student → /meus-bloqueios redirects to /campus', async ({ studentPage: page }) => {
    await page.goto('/#/meus-bloqueios');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 10000 });
  });

  test('cold deep-link: student → /relatorios redirects to /campus', async ({ studentPage: page }) => {
    await page.goto('/#/relatorios');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 10000 });
  });
});

base.test('o primeiro Tab mostra o link para o conteúdo', async ({ page }) => {
  await page.goto('/#/login');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
});

test('a navegação anuncia a nova página e a sessão sobrevive ao recarregar', async ({ staffPage: page }) => {
  await page.goto('/#/campus');
  await expect(page.getByRole('heading', { name: 'Selecione seu campus' })).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/notificacoes'; });
  await expect(page).toHaveURL(/#\/notificacoes/);
  await expect(page.locator('#conteudo h1').last()).toBeFocused();
  await expect(page).toHaveTitle('Notificações · UFCIM');
  await page.goto('/#/relatorios');
  await page.reload();
  await expect(page).toHaveURL(/#\/relatorios/);
  await expect(page.getByRole('heading', { name: /relatório de ocupação/i })).toBeVisible();
});

test('não consulta notificações enquanto a aba está oculta', async ({ studentPage: page }) => {
  await page.clock.install();
  await page.goto('/#/campus');
  await expect(page.getByRole('heading', { name: 'Selecione seu campus' })).toBeVisible();
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/users/me')) requests++;
  });
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
  await page.clock.fastForward('01:01');
  expect(requests).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => requests).toBe(1);
});

test('o menu móvel entrega o foco ao título após navegar', async ({ studentPage: page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/#/campus');
  await expect(page.getByRole('heading', { name: 'Selecione seu campus' })).toBeVisible();
  const menuButton = page.getByRole('button', { name: 'Abrir menu' });
  await menuButton.click();
  await page.keyboard.press('Escape');
  await expect(menuButton).toBeFocused();
  await menuButton.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Notificações' }).click();
  await expect(page.getByRole('heading', { name: 'Notificações' })).toBeFocused();
  await page.waitForTimeout(350);
  await expect(page.getByRole('heading', { name: 'Notificações' })).toBeFocused();
});
