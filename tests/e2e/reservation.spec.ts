import { test, expect } from './fixtures';

// First seeded IAUD space from seed.sql (Sala de Leitura, B1-01, Benfica)
const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';

async function waitForSpaceLoad(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Carregando espaço'),
    { timeout: 10_000 }
  );
}

test.describe('ReservationView', () => {
  test('professor: route /reserva/:id resolves', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await page.waitForURL(/#\/reserva\//, { timeout: 10_000 });
    await expect(page).toHaveURL(/#\/reserva\//);
  });

  test('professor: description input is present and writable after slot selection', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForSpaceLoad(page);

    // Select a time slot (Manhã) to reveal the description section
    const manhaBtn = page.locator('button.slot-btn').filter({ hasText: /Manhã/i }).first();
    await expect(manhaBtn).toBeVisible({ timeout: 8_000 });
    await expect(manhaBtn).not.toBeDisabled({ timeout: 5_000 });
    await manhaBtn.click();

    const descInput = page.locator('#description-input');
    await expect(descInput).toBeVisible({ timeout: 5_000 });
    await descInput.fill('Aula de Engenharia de Software — E2E test');
    await expect(descInput).toHaveValue('Aula de Engenharia de Software — E2E test');
  });

  test('professor: description hint text is visible after slot selection', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForSpaceLoad(page);

    const manhaBtn = page.locator('button.slot-btn').filter({ hasText: /Manhã/i }).first();
    await expect(manhaBtn).toBeVisible({ timeout: 8_000 });
    await expect(manhaBtn).not.toBeDisabled({ timeout: 5_000 });
    await manhaBtn.click();

    await expect(page.locator('body')).toContainText(/opcional|visível|Descrição/i);
  });

  test('maintenance: /reserva redirects to campus (not in CAN_RESERVE)', async ({ maintenancePage: page }) => {
    // Navigate via campus first so user is hydrated
    await page.goto(`/#/campus`);
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/#\/campus/);
  });

  test('professor: date input is present', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForSpaceLoad(page);
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 8_000 });
  });

  test('student: can access reservation view (CAN_RESERVE includes students)', async ({ studentPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForSpaceLoad(page);
    await expect(page).toHaveURL(/#\/reserva\//);
    await expect(page.locator('body')).toContainText(/Fazer Reserva|Reserva/i);
  });
});
