import { test, expect } from './fixtures';
import type { EquipmentReport } from '../../src/types/equipment-report';

const RESOLVED_AT = '2026-10-12T15:45:00.000Z';
const DISMISSED_AT = '2026-10-13T09:20:00.000Z';

function makeReport(overrides: Partial<EquipmentReport>): EquipmentReport {
  return {
    id: '00000000-0000-0000-0000-000000000099',
    equipmentId: '00000000-0000-0000-0000-000000000021',
    reportedBy: '00000000-0000-0000-0000-000000000001',
    description: 'Teste de chamado',
    severity: 'major',
    status: 'pending',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: '2026-10-10T10:00:00.000Z',
    reporter: { id: '00000000-0000-0000-0000-000000000001', name: 'João Silva', role: 'student' },
    equipment: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'Projetor Epson',
      assetId: 'P-001',
      space: { id: 's-1', name: 'Sala A101', number: 'A101', block: '1' },
    },
    ...overrides,
  };
}

test.describe('Maintenance reports resolution date (#26)', () => {
  test('shows resolution date on resolved/dismissed tickets and hides it on open ones', async ({ staffPage: page }) => {
    const reportsByStatus: Record<EquipmentReport['status'], EquipmentReport[]> = {
      pending: [makeReport({ id: 'r-pending', status: 'pending', description: 'Chamado pendente', resolvedAt: RESOLVED_AT })],
      acknowledged: [makeReport({ id: 'r-ack', status: 'acknowledged', description: 'Chamado em análise', resolvedAt: RESOLVED_AT })],
      resolved: [makeReport({ id: 'r-resolved', status: 'resolved', description: 'Chamado resolvido', resolvedAt: RESOLVED_AT })],
      dismissed: [makeReport({ id: 'r-dismissed', status: 'dismissed', description: 'Chamado descartado', resolvedAt: DISMISSED_AT, dismissedReason: 'Duplicado' })],
    };

    await page.route('**/api/v1/equipment/reports/pending*', async (route) => {
      const url = new URL(route.request().url());
      const status = (url.searchParams.get('status') ?? 'pending') as EquipmentReport['status'];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reportsByStatus[status] ?? []),
      });
    });

    await page.goto('/#/manutencao/chamados');

    const formatExpected = (iso: string) =>
      page.evaluate(
        (v) =>
          new Date(v).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        iso,
      );

    const pendingCard = page.locator('.report-card').filter({ hasText: 'Chamado pendente' });
    await expect(pendingCard).toBeVisible();
    await expect(pendingCard).not.toContainText('Resolvido em');
    await expect(pendingCard).not.toContainText('Descartado em');

    await page.getByRole('tab', { name: 'Em análise' }).click();
    const ackCard = page.locator('.report-card').filter({ hasText: 'Chamado em análise' });
    await expect(ackCard).toBeVisible();
    await expect(ackCard).not.toContainText('Resolvido em');
    await expect(ackCard).not.toContainText('Descartado em');

    await page.getByRole('tab', { name: 'Resolvidos' }).click();
    const resolvedCard = page.locator('.report-card').filter({ hasText: 'Chamado resolvido' });
    await expect(resolvedCard).toBeVisible();
    await expect(resolvedCard).toContainText(`Resolvido em ${await formatExpected(RESOLVED_AT)}`);
    await expect(resolvedCard).not.toContainText('Descartado em');

    await page.getByRole('tab', { name: 'Descartados' }).click();
    const dismissedCard = page.locator('.report-card').filter({ hasText: 'Chamado descartado' });
    await expect(dismissedCard).toBeVisible();
    await expect(dismissedCard).toContainText(`Descartado em ${await formatExpected(DISMISSED_AT)}`);
    await expect(dismissedCard).not.toContainText('Resolvido em');
  });
});
