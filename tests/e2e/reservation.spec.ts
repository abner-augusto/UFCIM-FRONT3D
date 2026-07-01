import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// First seeded IAUD space from seed.sql (Sala de Leitura, B1-01, Benfica).
const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';
const CAMPUS = 'benfica';
const MODEL_ID = 'Sala de Leitura (Biblioteca)';

async function waitForReservationFallbackLoad(page: Page) {
  const dateControl = page.locator('#reservation-date');
  const loadError = page.getByText(/Não foi possível carregar os dados do espaço/i);

  await expect(dateControl.or(loadError)).toBeVisible({ timeout: 20_000 });
  await expect(loadError).toHaveCount(0);
}

async function openContextualReservationTray(page: Page) {
  // The viewer asks availability for every rendered pin. For these tests we are
  // validating the new tray structure, not the availability service itself;
  // keep that fan-out deterministic so the tray can load before the test budget
  // is burned by dozens of local D1 calls.
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { startTime: '07:00', endTime: '08:00', status: 'available' },
        { startTime: '08:00', endTime: '09:00', status: 'available' },
        { startTime: '09:00', endTime: '10:00', status: 'available' },
        { startTime: '10:00', endTime: '11:00', status: 'available' },
        { startTime: '11:00', endTime: '12:00', status: 'available' },
      ]),
    }),
  );

  await page.goto(`/#/campus/${CAMPUS}/viewer`);
  await page.waitForFunction(
    () => {
      const viewer = (window as unknown as {
        __ufcimViewer?: { listRooms?: () => Array<{ modelId: string; name: string }> };
      }).__ufcimViewer;
      return (viewer?.listRooms?.().length ?? 0) > 0;
    },
    null,
    { timeout: 20_000 },
  );

  await page.evaluate((modelId) => {
    const viewer = (window as unknown as {
      __ufcimViewer?: { openRoom?: (modelId: string) => void | Promise<void> };
    }).__ufcimViewer;
    void viewer?.openRoom?.(modelId);
    return true;
  }, MODEL_ID);

  await page.getByRole('button', { name: /Reservar das/i }).click({ timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: /Fazer reserva/i })).toBeVisible({ timeout: 10_000 });
}

async function selectFirstTraySlot(page: Page) {
  const firstAvailableHour = page.getByRole('button', { name: /Disponível/ }).first();
  await expect(firstAvailableHour).toBeVisible({ timeout: 30_000 });
  await firstAvailableHour.click();
  await expect(page.getByText(/Horário selecionado:/i)).toBeVisible({ timeout: 5_000 });
}

test.describe('ReservationView fallback route', () => {
  test('professor: route /reserva/:id resolves', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await page.waitForURL(/#\/reserva\//, { timeout: 10_000 });
    await expect(page).toHaveURL(/#\/reserva\//);
  });

  test('professor: fallback page still exposes date, purpose and description after slot selection', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForReservationFallbackLoad(page);

    const availableSlot = page.locator('button.slot-btn:not([disabled])').first();
    await expect(availableSlot).toBeVisible({ timeout: 15_000 });
    await availableSlot.click();

    await expect(page.locator('#reservation-purpose')).toBeVisible({ timeout: 5_000 });

    const descInput = page.locator('#description-input');
    await expect(descInput).toBeVisible({ timeout: 5_000 });
    await descInput.fill('Aula de Engenharia de Software — E2E test');
    await expect(descInput).toHaveValue('Aula de Engenharia de Software — E2E test');
    await expect(page.locator('body')).toContainText(/opcional|visível|Descrição/i);
  });

  test('maintenance: /reserva redirects to campus (not in CAN_RESERVE)', async ({ maintenancePage: page }) => {
    // Navigate via campus first so user is hydrated.
    await page.goto('/#/campus');
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/#\/campus/);
  });

  test('professor: date control is present', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForReservationFallbackLoad(page);
    await expect(page.locator('#reservation-date')).toBeVisible({ timeout: 15_000 });
  });

  test('student: can access reservation view (CAN_RESERVE includes students)', async ({ studentPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    await waitForReservationFallbackLoad(page);
    await expect(page).toHaveURL(/#\/reserva\//);
    await expect(page.locator('body')).toContainText(/Fazer Reserva|Reserva/i);
  });
});

test.describe('ReservationTray contextual flow', () => {
  test.setTimeout(60_000);

  test('professor: viewer reserve action opens the contextual schedule step', async ({ professorPage: page }) => {
    await openContextualReservationTray(page);

    await expect(page.locator('#tray-reservation-date')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Escolher horário' })).toBeVisible();
    await expect(page.getByText('Campus benfica', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Disponível/ }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('professor: schedule selection advances to purpose and confirmation structure', async ({ professorPage: page }) => {
    await openContextualReservationTray(page);
    await selectFirstTraySlot(page);

    await page.getByRole('button', { name: /^Continuar$/i }).click();
    await expect(page.getByRole('heading', { name: 'Informar finalidade' })).toBeVisible({ timeout: 5_000 });

    const purposeSelect = page.locator('#tray-reservation-purpose');
    await expect(purposeSelect).toBeVisible();
    await purposeSelect.selectOption({ index: 1 });

    const trayDescription = page.locator('#tray-description-input');
    await expect(trayDescription).toBeVisible();
    await trayDescription.fill('Modelagem Tridimensional — E2E tray');
    await expect(trayDescription).toHaveValue('Modelagem Tridimensional — E2E tray');
    await expect(page.locator('#tray-description-hint')).toContainText(/opcional/i);

    await page.getByRole('button', { name: /^Continuar$/i }).click();
    await expect(page.getByRole('heading', { name: 'Confirmar reserva' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /^Confirmar reserva$/i })).toBeVisible();
    await expect(page.locator('body')).toContainText(/Sala de Leitura|Finalidade|Modelagem Tridimensional/i);
  });
});
