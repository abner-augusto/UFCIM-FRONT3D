import { test, expect } from './fixtures';

const SPACE_ID = 'a1a00001-0000-4000-8000-000000000000';
const MODEL_ID = 'Sala de Leitura (Biblioteca)';

async function openContextualBlockingTray(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        Array.from({ length: 15 }, (_, i) => {
          const hour = 7 + i;
          const pad = (value: number) => String(value).padStart(2, '0');
          return { startTime: `${pad(hour)}:00`, endTime: `${pad(hour + 1)}:00`, status: 'available' };
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
    await expect(page.locator('#blocking-date')).toBeVisible({ timeout: 15_000 });
    await page.locator('#blocking-date').fill('2099-04-06');
    await page.locator('#blocking-type').selectOption({ index: 1 });

    await page.route('**/api/v1/blockings', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'blocking-refresh-e2e' }),
      }),
    );

    await page.getByRole('button', { name: /^Bloquear Espaço$/i }).click();
    await expect(page.getByRole('status')).toContainText('Espaço bloqueado', { timeout: 10_000 });
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
        body: JSON.stringify({ id: 'blocking-tray-e2e' }),
      }),
    );

    await page.locator('#blocking-type').selectOption({ index: 1 });
    await page.getByRole('button', { name: /^Bloquear Espaço$/i }).click();
    await expect(page.getByRole('status')).toContainText('Espaço bloqueado', { timeout: 10_000 });
    await expect(page).toHaveURL(/#\/campus\/benfica\/viewer$/);
    await expect(page.getByRole('button', { name: 'Voltar para maquete' })).toBeVisible();
  });
});
