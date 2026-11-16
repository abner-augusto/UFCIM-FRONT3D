import { test, expect } from './fixtures';

const CAMPUS = 'benfica';
const SPACE_NUMBER = 'B2-02';

test.describe('Auditório equipment and details (BUG-020)', () => {
  test('shows hvac, multimedia, and all equipment groups in details and report dialog', async ({ studentPage }) => {
    await studentPage.goto(`/#/campus/${CAMPUS}/espacos`);
    await studentPage.waitForFunction(
      () => !document.querySelector('[aria-label="Carregando espaços"]'),
      { timeout: 15_000 },
    );
    await studentPage.getByLabel('Buscar por nome ou número').fill(SPACE_NUMBER);

    const card = studentPage.locator('.space-card').filter({ hasText: SPACE_NUMBER });
    await card.locator('.space-card__summary').click();
    await card.getByRole('button', { name: 'Mais detalhes' }).click();

    await expect(card).toContainText('Ar condicionado split (1 unidade)');
    await expect(card).toContainText('Projetor (1), Microfone com pedestal (1), Caixas de som (2)');

    const equipmentList = card.locator('.equipment-list').first();
    await expect(equipmentList).toContainText('Ar Condicionado Split');
    await expect(equipmentList).toContainText('Projetor');
    await expect(equipmentList).toContainText('Microfone com pedestal');
    await expect(equipmentList).toContainText('Caixa de som (2)');

    await card.getByRole('button', { name: 'Reportar problema', exact: true }).click();
    const dialog = studentPage.getByRole('dialog');
    await dialog.getByRole('button', { name: /Um equipamento/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Qual equipamento?' })).toBeVisible();

    await expect(dialog.getByRole('button', { name: 'Ar Condicionado Split' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Projetor' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Microfone com pedestal' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Caixa de som' })).toBeVisible();
  });
});
