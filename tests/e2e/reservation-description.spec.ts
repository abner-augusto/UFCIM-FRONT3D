import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';

const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';
const PROFESSOR_ID = '00000000-0000-0000-0000-000000000002';
const CAMPUS = 'benfica';
const MODEL_ID = 'Sala de Leitura (Biblioteca)';
const LONG_DESCRIPTION = 'a'.repeat(300);

function halfHourAvailability(longDescOnMorning = false) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return Array.from({ length: 30 }, (_, i) => {
    const startTime = time(7 * 60 + i * 30);
    const endTime = time(7 * 60 + (i + 1) * 30);
    if (longDescOnMorning && startTime >= '09:00' && startTime < '10:00') {
      return {
        startTime,
        endTime,
        status: 'reserved',
        reservation: {
          id: 'desc-300-slot',
          purpose: 'class',
          description: LONG_DESCRIPTION,
          isRecurring: false,
          isSelf: false,
          author: { displayName: 'Prof. Teste', role: 'professor' },
        },
      };
    }
    return { startTime, endTime, status: 'available' };
  });
}

async function openViewerRoom(page: Page, longDescOnMorning = false) {
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(halfHourAvailability(longDescOnMorning)),
    }),
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
    const viewer = (window as unknown as { __ufcimViewer?: { openRoom?: (id: string) => void } }).__ufcimViewer;
    viewer?.openRoom?.(modelId);
  }, MODEL_ID);
}

async function assertCounterAndCap(input: Locator, counter: Locator) {
  await expect(input).toHaveAttribute('maxlength', '300');
  await expect(counter).toHaveText('0/300');
  await input.fill(LONG_DESCRIPTION);
  await expect(input).toHaveValue(LONG_DESCRIPTION);
  await expect(counter).toHaveText('300/300');
  await input.press('z');
  await expect(input).toHaveValue(LONG_DESCRIPTION);
  await expect(counter).toHaveText('300/300');
}

async function assertFits360Viewport(page: Page, container: Locator) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  const box = await container.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(360);
}

test.describe('Reservation description 300-char limit (#28)', () => {
  test.setTimeout(60_000);

  test('ReservationTray: description field shows counter and accepts up to 300 chars', async ({ professorPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    await openViewerRoom(page);

    const reserveButton = page.locator('button[aria-label^="Reservar das"]:enabled').first();
    await expect(reserveButton).toBeVisible({ timeout: 20_000 });
    await reserveButton.evaluate((btn) => (btn as HTMLButtonElement).click());

    const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
    await expect(tray).toBeVisible({ timeout: 10_000 });
    await expect(tray.locator('#tray-reservation-end')).toHaveValue('12:00', { timeout: 10_000 });
    await tray.getByRole('button', { name: /^Continuar$/i }).click();

    await assertCounterAndCap(tray.locator('#tray-description-input'), tray.getByTestId('tray-description-count'));
  });

  test('ReservationView: single and recurring description fields show counter and cap at 300 chars', async ({ professorPage: page }) => {
    await page.goto(`/#/reserva/${SPACE_ID}`);
    const slot = page.locator('button.slot-btn:not([disabled])').first();
    await expect(slot).toBeVisible({ timeout: 15_000 });
    await slot.click();

    await assertCounterAndCap(page.locator('#description-input'), page.getByTestId('description-count'));

    await page.getByRole('button', { name: /^Reserva recorrente$/i }).click();
    await assertCounterAndCap(page.locator('#rec-desc'), page.getByTestId('rec-description-count'));
  });

  test('MyReservationsView: 300-char description truncates on card and wraps without overflow at 360px', async ({ professorPage: page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const reservation = {
      id: 'desc-300-card',
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
      description: LONG_DESCRIPTION,
      cancelReason: null,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
      space: { id: SPACE_ID, number: 'B1-01', name: 'Sala de Leitura', campus: 'Benfica', department: 'iaud' },
    };

    await page.route('**/api/v1/reservations/mine**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([reservation]) }),
    );

    await page.goto('/#/minhas-reservas');
    const summary = page.getByRole('button', { name: /Sala de Leitura.*09:00[–-]10:00/i });
    await expect(summary).toBeVisible({ timeout: 15_000 });

    const card = page.locator('.reservation-card').first();
    await assertFits360Viewport(page, card);

    const cardDesc = card.locator('.reservation-card__description');
    const clamped = await cardDesc.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(clamped).toBe(true);

    await summary.click();
    await expect(card.locator('.detail-value--prose')).toHaveText(LONG_DESCRIPTION);
    await assertFits360Viewport(page, card);
  });

  test('RoomPopup: 300-char description truncates in slot detail without overflow at 360px', async ({ professorPage: page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await openViewerRoom(page, true);

    const popup = page.getByRole('dialog');
    await expect(popup).toBeVisible({ timeout: 20_000 });

    const reservedCell = popup.getByRole('button', { name: /09:00 a 10:00: Reservado/i });
    await expect(reservedCell).toBeVisible({ timeout: 10_000 });
    await reservedCell.click();

    const slotPurpose = popup.locator('.slot-purpose');
    await expect(slotPurpose).toBeVisible();
    await assertFits360Viewport(page, popup);

    const clamped = await slotPurpose.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(clamped).toBe(true);
  });
});
