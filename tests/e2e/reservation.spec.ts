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

type SlotStatus = 'available' | 'reserved' | 'blocked';

/** 07:00–22:00 in 30-minute slots (MEL-024), free except for the `busy` ranges. */
function halfHourDay(busy: Array<[from: string, to: string, status: SlotStatus]> = []) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return Array.from({ length: 30 }, (_, i) => {
    const startTime = time(7 * 60 + i * 30);
    const hit = busy.find(([from, to]) => startTime >= from && startTime < to);
    return { startTime, endTime: time(7 * 60 + (i + 1) * 30), status: hit ? hit[2] : 'available' };
  });
}

async function openContextualReservationTray(page: Page, slots = halfHourDay()) {
  // The viewer asks availability for every rendered pin. For these tests we are
  // validating the new tray structure, not the availability service itself;
  // keep that fan-out deterministic so the tray can load before the test budget
  // is burned by dozens of local D1 calls.
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(slots),
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
    await expect(page.getByLabel('Início', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Término', { exact: true })).toBeVisible();
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
    await page.locator('#rec-start').selectOption('07:00');
    await expect(page.locator('#rec-end')).toHaveValue('08:00'); // pre-filled with start + 1 hour
    await page.locator('#rec-end').selectOption('12:00');
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
    // At 10:30 the default range starts at the current half-hour slot (MEL-024).
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    await openContextualReservationTray(page);

    await expect(page.locator('#tray-reservation-start')).toHaveValue('10:30', { timeout: 10_000 });
    await expect(page.locator('#tray-reservation-end')).toHaveValue('12:00');
    await expect(page.getByRole('button', { name: /^Continuar$/i })).toBeEnabled();
  });

  test('professor: schedule selection advances to purpose and confirmation structure', async ({ professorPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    await openContextualReservationTray(page);

    const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
    await expect(tray.locator('#tray-reservation-end')).toHaveValue('12:00', { timeout: 10_000 });

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
    await expect(page.locator('#tray-reservation-end')).toHaveValue('12:00', { timeout: 10_000 });
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

test.describe('ReservationTray half-hour ranges (MEL-024)', () => {
  test.setTimeout(60_000);

  test('professor: reserves 16:30–18:00 from the tray', async ({ professorPage: page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.clock.setFixedTime(new Date('2026-09-02T08:00:00'));
    // 16:00–16:30 and 18:00–19:00 are taken: 16:30–18:00 is the free window.
    await openContextualReservationTray(page, halfHourDay([
      ['16:00', '16:30', 'reserved'],
      ['18:00', '19:00', 'reserved'],
    ]));

    const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
    const start = tray.locator('#tray-reservation-start');
    const end = tray.locator('#tray-reservation-end');
    await expect(start).toBeVisible({ timeout: 10_000 });

    await start.selectOption('16:30');
    await expect(end).toHaveValue('17:30'); // pre-filled with start + 1 hour
    // Only conflict-free ends of at least 1 hour are offered.
    await expect(end.locator('option:not([disabled])')).toHaveText([/^17:30/, /^18:00/]);
    await end.selectOption('18:00');
    await expect(tray.getByText(/Horário escolhido: 16:30–18:00/)).toBeVisible();

    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/reservations', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'reservation-half-hour-e2e' }),
      });
    });

    await tray.getByRole('button', { name: /^Continuar$/i }).click();
    await page.locator('#tray-reservation-purpose').selectOption({ index: 1 });
    await tray.getByRole('button', { name: /^Continuar$/i }).click();
    await expect(tray.getByText(/16:30[–-]18:00/).first()).toBeVisible();
    await tray.getByRole('button', { name: /^Confirmar reserva$/i }).click();

    await expect(page.getByText('Reserva concluída')).toBeVisible({ timeout: 10_000 });
    expect(requestBody).toMatchObject({ spaceId: SPACE_ID, date: '2026-09-02', startTime: '16:30', endTime: '18:00' });
  });

  test('professor: a 30-minute range cannot be built', async ({ professorPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T08:00:00'));
    // 17:30 has only 30 minutes free before the 18:00 booking.
    await openContextualReservationTray(page, halfHourDay([['18:00', '19:00', 'reserved']]));

    const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
    const start = tray.locator('#tray-reservation-start');
    const end = tray.locator('#tray-reservation-end');
    await expect(start).toBeVisible({ timeout: 10_000 });

    // No start is offered without 1 hour free ahead.
    await expect(start.locator('option[value="17:00"]')).toHaveCount(1);
    await expect(start.locator('option[value="17:30"]')).toHaveCount(0);
    await expect(start.locator('option[value="21:30"]')).toHaveCount(0);

    // The earliest end is always start + 1 hour.
    await start.selectOption('16:00');
    await expect(end.locator('option[value="16:30"]')).toHaveCount(0);
    await expect(end.locator('option:not([disabled])').first()).toHaveText(/^17:00/);
  });
});
