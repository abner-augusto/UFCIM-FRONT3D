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
      body: JSON.stringify(
        Array.from({ length: 15 }, (_, i) => {
          const h = 7 + i; // 07:00–22:00, all available so a future slot exists at any run time
          const pad = (n: number) => String(n).padStart(2, '0');
          return { startTime: `${pad(h)}:00`, endTime: `${pad(h + 1)}:00`, status: 'available' };
        }),
      ),
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

  const reserveButton = page.locator('button[aria-label^="Reservar das"]:enabled').first();
  await expect(reserveButton).toBeVisible({ timeout: 20_000 });
  await reserveButton.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.getByRole('dialog', { name: /Fazer reserva/i })).toBeVisible({ timeout: 10_000 });
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
    await expect(page.getByText('Campus Benfica', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Disponível/ }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('professor: contextual tray exposes recurring reservation form', async ({ professorPage: page }) => {
    await openContextualReservationTray(page);

    await expect(page.getByRole('button', { name: /^Reserva recorrente$/i })).toBeVisible();
    await page.getByRole('button', { name: /^Reserva recorrente$/i }).click();

    await expect(page.getByLabel('Data de início')).toBeVisible();
    await expect(page.getByLabel('Data de fim')).toBeVisible();
    await expect(page.getByLabel('Dia da semana')).toBeVisible();
    await expect(page.getByText('Agendar Reservas Recorrentes')).toBeVisible();
  });

  test('student: contextual tray does not expose recurring reservation mode', async ({ studentPage: page }) => {
    await openContextualReservationTray(page);

    await expect(page.getByRole('button', { name: /^Reserva recorrente$/i })).toHaveCount(0);
  });

  test('professor: contextual recurring form submits the recurring reservation payload', async ({ professorPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContextualReservationTray(page);
    await page.getByRole('button', { name: /^Reserva recorrente$/i }).click();

    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/reservations/recurring', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recurrenceId: 'recurrence-e2e', created: [], skipped: [] }),
      });
    });

    await page.getByLabel('Data de início').fill('2099-04-06');
    await page.getByLabel('Data de fim').fill('2099-04-27');
    await page.getByLabel('Dia da semana').selectOption('1');
    await page.getByRole('button', { name: /Manhã \(07:00[–-]12:00\)/i }).click();
    await page.getByLabel('Descrição da recorrência').fill('Aula semanal de teste');
    await page.getByRole('button', { name: 'Agendar Reservas Recorrentes' }).click();

    await expect(page.getByRole('status')).toContainText('0 reservas criadas');
    expect(requestBody).toEqual({
      spaceId: SPACE_ID,
      startDate: '2099-04-06',
      endDate: '2099-04-27',
      dayOfWeek: 1,
      startTime: '07:00',
      endTime: '12:00',
      description: 'Aula semanal de teste',
    });
  });

  test('professor: viewer schedule remains preselected after tray availability loads', async ({ professorPage: page }) => {
    // Keep the auto-detected morning range stable across local and CI runs.
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    await openContextualReservationTray(page);

    await expect(page.locator('.hour-cell--selected')).toHaveCount(2, { timeout: 10_000 });
    await expect(page.getByText(/Horário selecionado: 10:00–12:00/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Continuar$/i })).toBeEnabled();
  });

  test('professor: schedule selection advances to purpose and confirmation structure', async ({ professorPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    await openContextualReservationTray(page);

    const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
    await expect(tray.getByText(/Horário selecionado: 10:00–12:00/i)).toBeVisible({ timeout: 10_000 });

    await tray.getByRole('button', { name: /^Continuar$/i }).click();
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

  test('professor: returning to the viewer refreshes pin availability after reservation', async ({ professorPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    let availabilityRequestCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/spaces/') && request.url().includes('/availability?')) {
        availabilityRequestCount += 1;
      }
    });

    await openContextualReservationTray(page);
    await expect(page.locator('.hour-cell--selected')).toHaveCount(2, { timeout: 10_000 });
    await page.getByRole('button', { name: /^Continuar$/i }).click();
    await page.locator('#tray-reservation-purpose').selectOption({ index: 1 });
    await page.getByRole('button', { name: /^Continuar$/i }).click();
    await expect(page.getByRole('button', { name: /^Confirmar reserva$/i })).toBeVisible();

    await page.route('**/api/v1/reservations', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'reservation-refresh-e2e' }),
      }),
    );

    await page.getByRole('button', { name: /^Confirmar reserva$/i }).click();
    await expect(page.getByText('Reserva concluída')).toBeVisible({ timeout: 10_000 });
    const requestsBeforeReturn = availabilityRequestCount;

    await page.getByRole('button', { name: 'Voltar para maquete' }).click();
    await expect.poll(() => availabilityRequestCount).toBeGreaterThan(requestsBeforeReturn);
  });
});
