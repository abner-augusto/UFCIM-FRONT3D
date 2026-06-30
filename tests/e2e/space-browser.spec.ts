import { test, expect } from './fixtures';

// Benfica is the only active campus and is seeded with IAUD spaces (see seed.sql).
const CAMPUS = 'benfica';

async function waitForSpacesLoaded(page: import('@playwright/test').Page) {
  // The skeleton list disappears and the block sections render once spaces load.
  await page.waitForFunction(
    () => !document.querySelector('[aria-label="Carregando espaços"]'),
    { timeout: 15_000 },
  );
}

test.describe('SpaceBrowser progressive filters', () => {
  test('search and date stay primary in the toolbar', async ({ studentPage: page }) => {
    await page.goto(`/#/campus/${CAMPUS}/espacos`);

    await expect(page.getByRole('heading', { name: 'Buscar Espaços' })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar por nome/i)).toBeVisible();
    await expect(page.locator('#browser-date')).toBeVisible();
  });

  test('Filtros button opens the filters sheet', async ({ studentPage: page }) => {
    await page.goto(`/#/campus/${CAMPUS}/espacos`);

    const trigger = page.getByTestId('open-space-filters');
    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(page.getByRole('heading', { name: 'Filtros' })).toBeVisible();
    // Advanced filters now live inside the sheet.
    await expect(page.getByLabel('Filtrar por bloco')).toBeVisible();
    await expect(page.getByLabel('Filtrar por tipo')).toBeVisible();
  });

  test('choosing a filter shows a removable chip; clearing the chip removes the filter', async ({
    studentPage: page,
  }) => {
    await page.goto(`/#/campus/${CAMPUS}/espacos`);
    await waitForSpacesLoaded(page);

    // No active filters initially.
    await expect(page.getByTestId('active-filter-chip')).toHaveCount(0);

    await page.getByTestId('open-space-filters').click();

    const blockSelect = page.getByLabel('Filtrar por bloco');
    await expect(blockSelect).toBeVisible();
    // Index 0 is the "Todos os blocos" placeholder; index 1 is the first real
    // seeded block. selectOption fails if no real option exists, which also
    // protects against an empty dataset.
    const blockLabel = (await blockSelect.locator('option').nth(1).textContent())?.trim() ?? '';
    await blockSelect.selectOption({ index: 1 });

    // Close the sheet to interact with the chips in the main view.
    await page.keyboard.press('Escape');

    const chip = page.getByTestId('active-filter-chip').filter({ hasText: blockLabel });
    await expect(chip).toBeVisible();

    // Clearing the chip removes the filter.
    await chip.getByRole('button', { name: /Remover filtro/i }).click();
    await expect(page.getByTestId('active-filter-chip').filter({ hasText: blockLabel })).toHaveCount(0);
  });
});
