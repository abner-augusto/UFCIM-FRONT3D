import { test, expect } from './fixtures';

const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';
const MODEL_ID = 'Sala de Leitura (Biblioteca)';

async function openContextualBlockingTray(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        // 07:00–22:00 in 30-minute slots (MEL-024), all available.
        Array.from({ length: 30 }, (_, i) => {
          const pad = (value: number) => String(value).padStart(2, '0');
          const time = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
          return { startTime: time(420 + i * 30), endTime: time(450 + i * 30), status: 'available' };
        }),
      ),
    }),
  );

  await page.goto('/#/campus/benfica/viewer');
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
      __ufcimViewer?: { openRoom?: (id: string) => void | Promise<void> };
    }).__ufcimViewer;
    void viewer?.openRoom?.(modelId);
  }, MODEL_ID);

  await expect(page.getByRole('button', { name: 'Bloquear espaço' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Bloquear espaço' }).click();
  await expect(page.getByRole('dialog', { name: /Bloquear espaço/i })).toBeVisible({ timeout: 10_000 });
}

test.describe('BlockingCreateView', () => {
  test('maintenance: returning to the viewer reloads the blocked space pins', async ({ maintenancePage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let availabilityRequestCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/spaces/') && request.url().includes('/availability?')) {
        availabilityRequestCount += 1;
      }
    });

    await page.goto(`/#/espacos/${SPACE_ID}/bloquear`);
    await expect(page.locator('#blocking-date-from')).toBeVisible({ timeout: 15_000 });
    await page.locator('#blocking-date-from').fill('2099-04-06');
    await page.locator('#blocking-date-to').fill('2099-04-08');

    await page.route('**/api/v1/blockings', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blockings: [], created: 3, overriddenReservations: 0 }),
      }),
    );

    await page.getByRole('button', { name: /^Bloquear Espaço$/i }).click();
    await expect(page.getByRole('status')).toContainText('3 dias bloqueados', { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Voltar para maquete' })).toBeVisible();

    await page.getByRole('button', { name: 'Voltar para maquete' }).click();
    await expect(page).toHaveURL(/#\/campus\/benfica\/viewer\?space=/, { timeout: 10_000 });
    await expect.poll(() => availabilityRequestCount).toBeGreaterThan(0);
  });

  test('maintenance: blocking from the viewer stays in the contextual tray', async ({ maintenancePage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContextualBlockingTray(page);

    await page.route('**/api/v1/blockings', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blockings: [], created: 1, overriddenReservations: 0 }),
      }),
    );

    // The maintenance profile has no type selector — the backend forces 'maintenance'.
    await expect(page.locator('#blocking-type')).toHaveCount(0);
    await expect(page.getByText('Manutenção', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Bloquear Espaço$/i }).click();
    await expect(page.getByRole('status')).toContainText('Espaço bloqueado', { timeout: 10_000 });
    await expect(page).toHaveURL(/#\/campus\/benfica\/viewer$/);
    await expect(page.getByRole('button', { name: 'Voltar para maquete' })).toBeVisible();
  });

  test('staff: still chooses the blocking type explicitly (MEL-016)', async ({ staffPage: page }) => {
    await page.goto(`/#/espacos/${SPACE_ID}/bloquear`);

    await expect(page.locator('#blocking-date-from')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#blocking-type')).toBeVisible();
  });

  test('maintenance: blocks a half-hour custom range of at least 1 hour (MEL-024)', async ({ maintenancePage: page }) => {
    // Mobile viewport: AppDateField is a native date input there (a calendar popover on desktop).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/espacos/${SPACE_ID}/bloquear`);
    await expect(page.locator('#blocking-date-from')).toBeVisible({ timeout: 15_000 });
    await page.locator('#blocking-date-from').fill('2099-04-06');

    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/blockings', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blockings: [], created: 1, overriddenReservations: 0 }),
      });
    });

    await page.getByRole('button', { name: 'Horário personalizado' }).click();
    await page.locator('#blocking-start').selectOption('16:30');
    await expect(page.locator('#blocking-end')).toHaveValue('17:30');
    await expect(page.locator('#blocking-end option[value="17:00"]')).toHaveCount(0);
    await page.locator('#blocking-end').selectOption('18:00');

    await page.getByRole('button', { name: /^Bloquear Espaço$/i }).click();
    await expect.poll(() => requestBody).toMatchObject({ startTime: '16:30', endTime: '18:00' });
  });
});
