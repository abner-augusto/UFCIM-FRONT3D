import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from './fixtures';
import type { APIRequestContext } from '@playwright/test';

// MEL-023: edit a reservation's date, time and description; owner or staff only.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://localhost:8787/api/v1';
// First seeded IAUD space from seed.sql (Sala de Leitura, B1-01, Benfica).
const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';
const PROFESSOR_ID = '00000000-0000-0000-0000-000000000002';
const RESERVATION_ID = 'mel023-e2e-reservation';

type SlotStatus = 'available' | 'reserved';

/** 07:00–22:00 in half hours: own reservation 09:00–10:00, someone else's 11:00–12:00. */
function availability() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const reservedBy = (id: string, isSelf: boolean) => ({
    id,
    purpose: 'class',
    description: null,
    isRecurring: false,
    isSelf,
    author: { displayName: isSelf ? 'Você' : 'Outra pessoa', role: 'professor' },
  });
  return Array.from({ length: 30 }, (_, i) => {
    const startTime = time(7 * 60 + i * 30);
    const endTime = time(7 * 60 + (i + 1) * 30);
    if (startTime >= '09:00' && startTime < '10:00') {
      return { startTime, endTime, status: 'reserved' as SlotStatus, reservation: reservedBy(RESERVATION_ID, true) };
    }
    if (startTime >= '11:00' && startTime < '12:00') {
      return { startTime, endTime, status: 'reserved' as SlotStatus, reservation: reservedBy('someone-else', false) };
    }
    return { startTime, endTime, status: 'available' as SlotStatus };
  });
}

const OWN_RESERVATION = {
  id: RESERVATION_ID,
  spaceId: SPACE_ID,
  userId: PROFESSOR_ID,
  date: '2099-04-06',
  timeSlot: 'morning',
  startTime: '09:00',
  endTime: '10:00',
  status: 'confirmed',
  changeOrigin: null,
  recurrenceId: null,
  purpose: 'class',
  description: 'Aula de projeto',
  cancelReason: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  space: { id: SPACE_ID, number: 'B1-01', name: 'Sala de Leitura', campus: 'Benfica', department: 'iaud' },
};

test.describe('MyReservationsView: editar reserva (MEL-023)', () => {
  test.setTimeout(60_000);

  test('professor: edita horário e descrição da própria reserva e a lista se atualiza sem recarregar', async ({ professorPage: page }) => {
    let patchBody: Record<string, unknown> | undefined;
    let mineRequests = 0;

    await page.route('**/api/v1/reservations/mine**', (route) => {
      mineRequests += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([OWN_RESERVATION]) });
    });
    await page.route('**/api/v1/spaces/*/availability?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(availability()) }),
    );
    await page.route(`**/api/v1/reservations/${RESERVATION_ID}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      patchBody = route.request().postDataJSON() as Record<string, unknown>;
      const { space: _space, ...row } = OWN_RESERVATION;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...row, ...patchBody, updatedAt: '2026-10-10T12:00:00.000Z' }),
      });
    });

    await page.goto('/#/minhas-reservas');
    const summary = page.getByRole('button', { name: /Sala de Leitura.*09:00[–-]10:00/i });
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await summary.click();
    await page.getByRole('button', { name: /^Editar reserva$/i }).click();

    const tray = page.getByRole('dialog', { name: /Editar reserva/i });
    await expect(tray).toBeVisible();
    // Prefilled with the current interval, which counts as free while editing.
    await expect(tray.locator('#tray-reservation-start')).toHaveValue('09:00', { timeout: 10_000 });
    await expect(tray.locator('#tray-reservation-end')).toHaveValue('10:00');

    await tray.locator('#tray-reservation-start').selectOption('14:00');
    await tray.locator('#tray-reservation-end').selectOption('15:30');
    await tray.getByRole('button', { name: /^Continuar$/i }).click();

    // Description only: the purpose is not editable.
    await expect(tray.locator('#tray-reservation-purpose')).toHaveCount(0);
    const description = tray.locator('#tray-description-input');
    await expect(description).toHaveValue('Aula de projeto');
    await description.fill('Banca de TCC');
    await tray.getByRole('button', { name: /^Continuar$/i }).click();

    await expect(tray.getByTestId('reservation-confirm-previous')).toContainText('09:00–10:00');
    await tray.getByRole('button', { name: /^Salvar alterações$/i }).click();

    await expect(tray).toBeHidden({ timeout: 10_000 });
    expect(patchBody).toEqual({ startTime: '14:00', endTime: '15:30', description: 'Banca de TCC' });
    await expect(page.getByRole('button', { name: /Sala de Leitura.*14:00[–-]15:30/i })).toBeVisible();
    await expect(page.getByText('Banca de TCC').first()).toBeVisible();
    expect(mineRequests).toBe(1); // updated in place, no reload
  });
});

// Real backend: the permission rule is enforced server-side.
test.describe('API: quem pode editar e cancelar (MEL-023)', () => {
  function tokens(): Record<string, string> {
    return JSON.parse(readFileSync(path.resolve(__dirname, '.auth', 'tokens.json'), 'utf8'));
  }

  function auth(role: string) {
    return { Authorization: `Bearer ${tokens()[role]}` };
  }

  // A random far-future date keeps reruns clear of leftovers from a failed run.
  function farFutureDate() {
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
    return `2098-${month}-${day}`;
  }

  async function reserve(request: APIRequestContext, role: string, startTime: string, endTime: string) {
    const response = await request.post(`${API}/reservations`, {
      headers: auth(role),
      data: { spaceId: SPACE_ID, date: farFutureDate(), startTime, endTime, description: 'MEL-023 e2e' },
    });
    expect(response.status(), await response.text()).toBe(201);
    return (await response.json()) as { id: string; startTime: string; endTime: string };
  }

  test("professor recebe 403 ao editar ou cancelar a reserva de outra pessoa; staff consegue", async ({ request }) => {
    const studentReservation = await reserve(request, 'student', '08:00', '09:00');

    const professorCancel = await request.patch(`${API}/reservations/${studentReservation.id}/cancel`, { headers: auth('professor') });
    expect(professorCancel.status()).toBe(403);

    const professorEdit = await request.patch(`${API}/reservations/${studentReservation.id}`, {
      headers: auth('professor'),
      data: { description: 'Não deveria' },
    });
    expect(professorEdit.status()).toBe(403);

    const staffEdit = await request.patch(`${API}/reservations/${studentReservation.id}`, {
      headers: auth('staff'),
      data: { startTime: '08:30', endTime: '10:00' },
    });
    expect(staffEdit.status(), await staffEdit.text()).toBe(200);
    expect(await staffEdit.json()).toMatchObject({ startTime: '08:30', endTime: '10:00', status: 'confirmed' });

    const staffCancel = await request.patch(`${API}/reservations/${studentReservation.id}/cancel`, { headers: auth('staff') });
    expect(staffCancel.status()).toBe(200);
  });

  test('professor edita a própria reserva; menos de 1 hora é recusado', async ({ request }) => {
    const own = await reserve(request, 'professor', '13:00', '14:00');

    const tooShort = await request.patch(`${API}/reservations/${own.id}`, {
      headers: auth('professor'),
      data: { endTime: '13:30' },
    });
    expect(tooShort.status()).toBe(400);

    const edit = await request.patch(`${API}/reservations/${own.id}`, {
      headers: auth('professor'),
      data: { startTime: '15:00', endTime: '16:30', description: 'Editada no e2e' },
    });
    expect(edit.status(), await edit.text()).toBe(200);
    expect(await edit.json()).toMatchObject({ startTime: '15:00', endTime: '16:30', description: 'Editada no e2e' });

    const cancel = await request.patch(`${API}/reservations/${own.id}/cancel`, { headers: auth('professor') });
    expect(cancel.status()).toBe(200);
  });
});
