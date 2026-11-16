import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';

const CAMPUS = 'benfica';
const SPACE_NUMBER = 'B1-01';

function availableDaySlots() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return Array.from({ length: 30 }, (_, i) => ({
    startTime: time(7 * 60 + i * 30),
    endTime: time(7 * 60 + (i + 1) * 30),
    status: 'available',
  }));
}

async function openSpaceCard(page: Page): Promise<Locator> {
  await page.route('**/api/v1/spaces/*/availability?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(availableDaySlots()),
    }),
  );

  await page.goto(`/#/campus/${CAMPUS}/espacos`);
  await page.waitForFunction(
    () => !document.querySelector('[aria-label="Carregando espaços"]'),
    { timeout: 15_000 },
  );
  await page.getByLabel('Buscar por nome ou número').fill(SPACE_NUMBER);

  const card = page.locator('.space-card').filter({ hasText: SPACE_NUMBER }).first();
  await card.locator('.space-card__summary').click();
  return card;
}

async function openEquipmentReportFromCard(card: Locator, page: Page): Promise<Locator> {
  const detailsBtn = card.getByRole('button', { name: 'Mais detalhes' });
  if (await detailsBtn.isVisible()) {
    await detailsBtn.click();
  }
  await card.getByRole('button', { name: 'Reportar problema', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Reportar problema' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Overlay discard confirmation', () => {
  test.setTimeout(60_000);

  test('EquipmentReportDialog: limpo fecha sem confirmação; sujo confirma ao clicar fora', async ({ studentPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    const card = await openSpaceCard(page);

    const cleanByClick = await openEquipmentReportFromCard(card, page);
    await page.mouse.click(8, 8);
    await expect(page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' })).toHaveCount(0);
    await expect(cleanByClick).toBeHidden();

    const cleanByEsc = await openEquipmentReportFromCard(card, page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' })).toHaveCount(0);
    await expect(cleanByEsc).toBeHidden();

    const dialog = await openEquipmentReportFromCard(card, page);
    await dialog.getByRole('button', { name: /A sala \(outro problema\)/ }).click();
    await dialog.locator('.category-grid button:not([disabled])').first().click();

    const desc = dialog.locator('#report-desc');
    await desc.fill('Lâmpada piscando na frente da sala');

    await page.mouse.click(8, 8);
    const confirm = page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' });
    await expect(confirm).toBeVisible();
    await expect(dialog).toBeVisible();

    const keepBtn = confirm.getByRole('button', { name: 'Continuar editando' });
    await expect(keepBtn).toBeFocused();
    await keepBtn.click();

    await expect(confirm).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(desc).toHaveValue('Lâmpada piscando na frente da sala');

    await page.mouse.click(8, 8);
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Descartar' }).click();

    await expect(confirm).toBeHidden();
    await expect(dialog).toBeHidden();
  });

  test('ReservationTray: limpo fecha sem confirmação; preenchido confirma no Esc', async ({ professorPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    const card = await openSpaceCard(page);

    await card.getByRole('button', { name: 'Fazer Reserva' }).click();
    const tray = page.getByRole('dialog', { name: /Fazer reserva/i });
    await expect(tray).toBeVisible();
    await expect(tray.locator('#tray-reservation-start')).toHaveValue('10:30', { timeout: 10_000 });

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' })).toHaveCount(0);
    await expect(tray).toBeHidden();

    await card.getByRole('button', { name: 'Fazer Reserva' }).click();
    await expect(tray).toBeVisible();
    await expect(tray.locator('#tray-reservation-start')).toHaveValue('10:30', { timeout: 10_000 });

    await page.mouse.click(8, 8);
    await expect(page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' })).toHaveCount(0);
    await expect(tray).toBeHidden();

    await card.getByRole('button', { name: 'Fazer Reserva' }).click();
    await expect(tray).toBeVisible();
    await expect(tray.locator('#tray-reservation-start')).toHaveValue('10:30', { timeout: 10_000 });

    await tray.getByRole('button', { name: /^Continuar$/i }).click();
    await tray.locator('#tray-reservation-purpose').selectOption({ index: 1 });
    await tray.locator('#tray-description-input').fill('Seminário de projeto');

    await page.keyboard.press('Escape');
    const confirm = page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' });
    await expect(confirm).toBeVisible();
    await expect(tray).toBeVisible();

    const keepBtn = confirm.getByRole('button', { name: 'Continuar editando' });
    await expect(keepBtn).toBeFocused();
    await keepBtn.click();

    await expect(confirm).toBeHidden();
    await expect(tray.locator('#tray-description-input')).toHaveValue('Seminário de projeto');

    await page.keyboard.press('Escape');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Descartar' }).click();

    await expect(confirm).toBeHidden();
    await expect(tray).toBeHidden();
  });

  test('BlockingTray: limpo fecha sem confirmação; preenchido confirma no X e Esc', async ({ staffPage: page }) => {
    await page.clock.setFixedTime(new Date('2026-09-02T10:30:00'));
    const card = await openSpaceCard(page);

    await card.getByRole('button', { name: 'Bloquear Espaço' }).click();
    const tray = page.getByRole('dialog', { name: /Bloquear espaço/i });
    await expect(tray).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' })).toHaveCount(0);
    await expect(tray).toBeHidden();

    await card.getByRole('button', { name: 'Bloquear Espaço' }).click();
    await expect(tray).toBeVisible();
    await tray.locator('#blocking-reason').fill('Manutenção elétrica');

    await tray.getByRole('button', { name: 'Close' }).click();
    const confirm = page.getByRole('dialog', { name: 'Descartar o que foi preenchido?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Continuar editando' }).click();
    await expect(tray.locator('#blocking-reason')).toHaveValue('Manutenção elétrica');

    await page.keyboard.press('Escape');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Descartar' }).click();
    await expect(tray).toBeHidden();
  });
});
