import { test, expect } from './fixtures';

// MEL-026: a maintenance ticket about the room itself, by service category.
// Auditório (B2-02) is seeded on Benfica and no other spec opens tickets there.
const CAMPUS = 'benfica';
const SPACE_NUMBER = 'B2-02';

test.describe('Room maintenance ticket', () => {
  test('student opens a room ticket and staff sees it in Chamados', async ({ studentPage, staffPage }) => {
    // ── Student: space browser → card → "Reportar problema" → room → category
    await studentPage.goto(`/#/campus/${CAMPUS}/espacos`);
    await studentPage.waitForFunction(
      () => !document.querySelector('[aria-label="Carregando espaços"]'),
      { timeout: 15_000 },
    );
    await studentPage.getByLabel('Buscar por nome ou número').fill(SPACE_NUMBER);

    const card = studentPage.locator('.space-card').filter({ hasText: SPACE_NUMBER });
    await card.locator('.space-card__summary').click();
    await card.getByRole('button', { name: 'Mais detalhes' }).click();
    await card.getByRole('button', { name: 'Reportar problema', exact: true }).click();

    const dialog = studentPage.getByRole('dialog');
    await expect(dialog.getByText('O que está com problema?')).toBeVisible();
    await dialog.getByRole('button', { name: /A sala \(outro problema\)/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Qual o problema na sala?' })).toBeVisible();

    // First category without an open ticket: a failed earlier run may leave one open.
    const category = dialog.locator('.category-grid button:not([disabled])').first();
    const label = ((await category.locator('.category-btn__label').textContent()) ?? '').trim();
    expect(label).not.toBe('');
    await category.click();

    await dialog.getByRole('button', { name: /^Crítico/ }).click();
    const description = `E2E sala ${Date.now()}`;
    await dialog.getByLabel(/Descrição/).fill(description);
    await dialog.getByRole('button', { name: 'Enviar' }).click();
    await expect(dialog.getByText('Problema reportado. A equipe foi notificada.')).toBeVisible();

    // ── Staff: the ticket is listed with its category and can block the room
    await staffPage.goto('/#/manutencao/chamados');
    const ticket = staffPage.locator('.report-card').filter({ hasText: description });
    await expect(ticket).toBeVisible({ timeout: 10_000 });
    await expect(ticket.getByRole('heading', { name: label })).toBeVisible();
    await expect(ticket).toContainText('Problema na sala');
    await expect(ticket.getByRole('button', { name: 'Bloquear sala' })).toBeVisible();

    // Resolve it so reruns start from a clean category.
    await ticket.getByRole('button', { name: 'Resolver' }).click();
    await expect(ticket).toHaveCount(0);
  });
});
