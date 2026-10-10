import { test, expect } from './fixtures';

// MEL-013: equipment maintenance history, staff and maintenance only.

test.describe('Maintenance history (/manutencao/relatorios)', () => {
  test('staff: route renders the report', async ({ staffPage: page }) => {
    await page.goto('/#/manutencao/relatorios');
    await expect(page).toHaveURL(/#\/manutencao\/relatorios/);
    await expect(page.getByRole('heading', { name: 'Histórico de Manutenção' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Equipamentos no período' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reportes no período')).toBeVisible();
  });

  test('maintenance: route is accessible', async ({ maintenancePage: page }) => {
    await page.goto('/#/manutencao/relatorios');
    await expect(page).toHaveURL(/#\/manutencao\/relatorios/);
    await expect(page.getByRole('heading', { name: 'Histórico de Manutenção' })).toBeVisible();
  });

  test('staff: navigation shows the entry', async ({ staffPage: page }) => {
    await page.goto('/#/campus');
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await expect(page.locator('a[href="#/manutencao/relatorios"]').first()).toBeAttached();
  });

  test('student: route redirects to /campus and the entry is hidden', async ({ studentPage: page }) => {
    // Hydrate the student role before the guard fires
    await page.goto('/#/campus');
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await expect(page.locator('a[href="#/manutencao/relatorios"]')).toHaveCount(0);

    await page.goto('/#/manutencao/relatorios');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
  });

  test('professor: route redirects to /campus', async ({ professorPage: page }) => {
    await page.goto('/#/campus');
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await page.goto('/#/manutencao/relatorios');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
  });
});
