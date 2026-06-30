import { test, expect } from './fixtures';

const CANCELABLE_RESERVATION = {
  spaceName: 'Sala 01',
  date: /02 de abril de 2026|qui\., 02\/04\/2026/i,
  time: /09:00[–-]10:00/,
};

test.describe('MyReservationsView', () => {
  test('professor: cancelar reserva abre diálogo contextual do app', async ({ professorPage: page }) => {
    test.fixme(
      true,
      'fixtures e2e atuais não garantem uma reserva futura confirmada e cancelável em /minhas-reservas'
    );

    const nativeConfirmMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      nativeConfirmMessages.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto('/#/minhas-reservas');
    await expect(page).toHaveURL(/#\/minhas-reservas/);

    const reservationSummary = page.getByRole('button', {
      name: new RegExp(`${CANCELABLE_RESERVATION.spaceName}.*09:00[–-]10:00`, 'i'),
    });
    await expect(reservationSummary).toBeVisible({ timeout: 10_000 });
    await reservationSummary.click();

    await page.getByRole('button', { name: /^Cancelar reserva$/i }).click();

    expect(nativeConfirmMessages).toHaveLength(0);

    const cancelDialog = page.getByRole('dialog', { name: /cancelar reserva/i });
    await expect(cancelDialog).toBeVisible();
    await expect(cancelDialog).toContainText(CANCELABLE_RESERVATION.spaceName);
    await expect(cancelDialog).toContainText(CANCELABLE_RESERVATION.date);
    await expect(cancelDialog).toContainText(CANCELABLE_RESERVATION.time);

    await expect(cancelDialog.getByRole('button', { name: /^Manter reserva$/i })).toBeVisible();
    await expect(cancelDialog.getByRole('button', { name: /^Cancelar reserva$/i })).toBeVisible();
  });
});
