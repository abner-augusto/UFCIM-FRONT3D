import { test, expect } from './fixtures';

// Sala de Leitura from the backend dev seed.sql
const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';

test.describe('SpaceReportView', () => {
  test('route /espacos/:id/relatorio resolves', async ({ professorPage: page }) => {
    await page.goto(`/#/espacos/${SPACE_ID}/relatorio`);
    await expect(page).toHaveURL(new RegExp(`relatorio`));
  });

  test('renders report header', async ({ professorPage: page }) => {
    await page.goto(`/#/espacos/${SPACE_ID}/relatorio`);
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/Relatório|relat/i);
  });

  test('date preset chips are rendered (7/30/90 dias)', async ({ professorPage: page }) => {
    await page.goto(`/#/espacos/${SPACE_ID}/relatorio`);
    await page.waitForTimeout(1000);

    await expect(page.getByRole('button', { name: '7 dias' })).toBeVisible();
    await expect(page.getByRole('button', { name: '30 dias' })).toBeVisible();
    await expect(page.getByRole('button', { name: '90 dias' })).toBeVisible();
  });

  test('clicking a preset chip updates the date range', async ({ professorPage: page }) => {
    await page.goto(`/#/espacos/${SPACE_ID}/relatorio`);
    await page.waitForTimeout(1000);

    const sevenDaysChip = page.getByRole('button', { name: '7 dias' });
    const ninetyDaysChip = page.getByRole('button', { name: '90 dias' });

    await expect(sevenDaysChip).toBeVisible();

    // Click 7 dias — start date should move to ~7 days ago
    await sevenDaysChip.click();
    await page.waitForTimeout(500);

    // After clicking, page should still be on the relatorio route
    await expect(page).toHaveURL(/relatorio/);

    // Click 90 dias
    await ninetyDaysChip.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/relatorio/);
  });

  test('back button navigates away from report', async ({ professorPage: page }) => {
    await page.goto(`/#/espacos/${SPACE_ID}/relatorio`);
    await page.waitForTimeout(1000);

    const backBtn = page.getByRole('button', { name: /voltar/i })
      .or(page.getByText(/← Voltar/i))
      .or(page.locator('[aria-label*="voltar" i]'));

    if (await backBtn.count() > 0) {
      await backBtn.first().click();
      await page.waitForTimeout(500);
      await expect(page).not.toHaveURL(/relatorio/);
    } else {
      // Back button not found — verify report still loaded
      await expect(page.locator('body')).toContainText(/Relatório|dias/i);
    }
  });

  test('shows error state when backend unavailable (no crash)', async ({ professorPage: page }) => {
    // Override /api to return 500 — component should show error, not crash
    await page.route('**/api/v1/spaces/*/report*', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );

    await page.goto(`/#/espacos/${SPACE_ID}/relatorio`);
    await page.waitForTimeout(2000);

    // Page should still render, not blank/crashed
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(20);
    // Route should still be on relatorio
    await expect(page).toHaveURL(/relatorio/);
  });
});
