import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// MEL-025: staff reserve on behalf of another person; the registered requester
// sees the reservation in "Minhas Reservas" and can cancel, but not edit, it.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://localhost:8787/api/v1';
// First seeded IAUD space from seed.sql (Sala de Leitura, B1-01, Benfica).
const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';
const CAMPUS = 'benfica';
const MODEL_ID = 'Sala de Leitura (Biblioteca)';
const PROFESSOR = { id: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa' };
const STAFF = { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira' };

/** 07:00–22:00 in 30-minute slots, all free. */
function freeDay() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return Array.from({ length: 30 }, (_, i) => ({
    startTime: time(7 * 60 + i * 30),
    endTime: time(7 * 60 + (i + 1) * 30),
    status: 'available',
  }));
}

/** A random far-future date keeps reruns clear of leftovers from a failed run. */
function farFutureDate() {
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `2097-${month}-${day}`;
}

async function openTray(page: Page) {
  // Pin availability is mocked to keep the viewer's fan-out deterministic; the
  // reservation itself is validated by the backend.
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(freeDay()) }),
  );

  await page.goto(`/#/campus/${CAMPUS}/viewer`);
  await page.waitForFunction(
    () => {
      const viewer = (window as unknown as { __ufcimViewer?: { listRooms?: () => unknown[] } }).__ufcimViewer;
      return (viewer?.listRooms?.().length ?? 0) > 0;
    },
    null,
    { timeout: 20_000 },
  );
  await page.evaluate((modelId) => {
    const viewer = (window as unknown as { __ufcimViewer?: { openRoom?: (id: string) => unknown } }).__ufcimViewer;
    void viewer?.openRoom?.(modelId);
  }, MODEL_ID);

  const reserveButton = page.locator('button[aria-label^="Reservar das"]:enabled').first();
  await expect(reserveButton).toBeVisible({ timeout: 20_000 });
  await reserveButton.evaluate((button) => (button as HTMLButtonElement).click());
  const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
  await expect(tray).toBeVisible({ timeout: 10_000 });
  return tray;
}

/**
 * The tray opens on the browser's "today", so pinning the browser clock to the
 * target day (before `openTray`) picks the date without driving the calendar.
 */
async function pinBrowserDay(page: Page, date: string) {
  await page.clock.setFixedTime(new Date(`${date}T08:00:00`));
}

async function fillScheduleAndPurpose(page: Page, description: string) {
  const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
  await tray.locator('#tray-reservation-start').selectOption('09:00');
  await tray.locator('#tray-reservation-end').selectOption('10:30');
  await tray.getByRole('button', { name: /^Continuar$/i }).click();

  await tray.locator('#tray-reservation-purpose').selectOption('class');
  await tray.locator('#tray-description-input').fill(description);
  return tray;
}

test.describe('Reservar em nome de outra pessoa (MEL-025)', () => {
  test.setTimeout(90_000);

  test('staff reserva para a professora pela bandeja; ela vê "para você" em Minhas Reservas e cancela', async ({
    staffPage,
    professorPage,
  }) => {
    const date = farFutureDate();
    const description = `MEL-025 e2e ${Date.now()}`;

    await pinBrowserDay(staffPage, date);
    await openTray(staffPage);
    const tray = await fillScheduleAndPurpose(staffPage, description);

    // The block is staff only and starts closed.
    await tray.getByTestId('reserve-on-behalf-toggle').click();
    await tray.getByTestId('reserve-on-behalf-search').fill('Maria');
    await tray.getByTestId('reserve-on-behalf-option').filter({ hasText: PROFESSOR.name }).click();
    await expect(tray.getByTestId('reserve-on-behalf-picked')).toContainText(PROFESSOR.name);
    await tray.getByTestId('reserve-on-behalf-contact').fill('maria.costa@ufc.br');
    await tray.getByRole('button', { name: /^Continuar$/i }).click();

    await expect(tray.getByTestId('reservation-confirm-requester')).toContainText(PROFESSOR.name);
    const created = staffPage.waitForResponse(
      (response) => response.url().endsWith('/api/v1/reservations') && response.request().method() === 'POST',
    );
    await tray.getByRole('button', { name: /^Confirmar reserva$/i }).click();
    const response = await created;
    expect(response.status(), await response.text()).toBe(201);
    expect(await response.json()).toMatchObject({ userId: STAFF.id, requesterUserId: PROFESSOR.id });
    await expect(staffPage.getByText('Reserva concluída')).toBeVisible({ timeout: 10_000 });

    // The professor sees it as made for her, can cancel it, cannot edit it.
    await professorPage.goto('/#/minhas-reservas');
    const card = professorPage.locator('li.reservation-card').filter({ hasText: description });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByTestId('reservation-requester-note')).toHaveText(`Reservada por ${STAFF.name} para você`);
    await card.locator('.reservation-card__summary').click();
    await expect(card.getByRole('button', { name: /^Editar reserva$/i })).toHaveCount(0);
    await card.getByRole('button', { name: /^Cancelar reserva$/i }).click();

    const dialog = professorPage.getByRole('dialog', { name: /cancelar reserva/i });
    await dialog.getByRole('button', { name: /^Cancelar reserva$/i }).click();
    await expect(dialog.getByRole('button', { name: /Reserva cancelada/i })).toBeVisible({ timeout: 10_000 });
    await expect(professorPage.locator('li.reservation-card').filter({ hasText: description })).toHaveCount(0, { timeout: 10_000 });
  });

  test('a bandeja envia o nome digitado como solicitante livre, com contato (rede simulada)', async ({ staffPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/v1/users/search?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/reservations', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'mel025-mock' }) });
    });

    await pinBrowserDay(page, '2099-05-04');
    const tray = await openTray(page);
    await fillScheduleAndPurpose(page, 'Reunião do CA');
    await tray.getByTestId('reserve-on-behalf-toggle').click();
    await tray.getByTestId('reserve-on-behalf-search').fill('Centro Acadêmico');
    await expect(tray.getByText(/Ninguém cadastrado com esse nome/)).toBeVisible();
    await tray.getByTestId('reserve-on-behalf-contact').fill('85 3366-0000');
    // On a phone-sized tray the block scrolls and the actions stay reachable.
    await expect(tray.getByRole('button', { name: /^Continuar$/i })).toBeInViewport();
    await tray.getByRole('button', { name: /^Continuar$/i }).click();

    await expect(tray.getByTestId('reservation-confirm-requester')).toContainText('Centro Acadêmico');
    await tray.getByRole('button', { name: /^Confirmar reserva$/i }).click();
    await expect(page.getByText('Reserva concluída')).toBeVisible({ timeout: 10_000 });
    expect(requestBody).toMatchObject({
      spaceId: SPACE_ID,
      date: '2099-05-04',
      startTime: '09:00',
      endTime: '10:30',
      requesterName: 'Centro Acadêmico',
      requesterContact: '85 3366-0000',
    });
    expect(requestBody).not.toHaveProperty('requesterUserId');
  });

  test('professor não vê o bloco "Reservar para outra pessoa"', async ({ professorPage: page }) => {
    await pinBrowserDay(page, '2099-05-04');
    const tray = await openTray(page);
    await fillScheduleAndPurpose(page, 'Aula');
    await expect(tray.getByTestId('reserve-on-behalf')).toHaveCount(0);
  });
});

// Real backend: the rules are enforced server-side.
test.describe('API: reservar em nome de outra pessoa (MEL-025)', () => {
  function auth(role: string) {
    const tokens = JSON.parse(readFileSync(path.resolve(__dirname, '.auth', 'tokens.json'), 'utf8')) as Record<string, string>;
    return { Authorization: `Bearer ${tokens[role]}` };
  }

  test('busca de usuários só responde a staff', async ({ request }) => {
    const staff = await request.get(`${API}/users/search?q=maria`, { headers: auth('staff') });
    expect(staff.status()).toBe(200);
    expect(await staff.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: PROFESSOR.id, name: PROFESSOR.name, role: 'professor' })]),
    );

    const professor = await request.get(`${API}/users/search?q=maria`, { headers: auth('professor') });
    expect(professor.status()).toBe(403);
  });

  test('campos de solicitante: 403 para não-staff, 400 para usuário inexistente', async ({ request }) => {
    const base = { spaceId: SPACE_ID, date: farFutureDate(), startTime: '19:00', endTime: '20:00' };

    const professor = await request.post(`${API}/reservations`, {
      headers: auth('professor'),
      data: { ...base, requesterName: 'Fulano' },
    });
    expect(professor.status()).toBe(403);

    const ghost = await request.post(`${API}/reservations`, {
      headers: auth('staff'),
      data: { ...base, requesterUserId: 'nao-existe' },
    });
    expect(ghost.status()).toBe(400);
  });
});
