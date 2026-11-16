import { test, expect, gotoCampusAfterRouterSettles, type Page } from './fixtures';

const LOGS_FIXTURE = [
  {
    id: 'log-1',
    userId: '00000000-0000-0000-0000-000000000003',
    actor: { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira' },
    actionType: 'create_reservation',
    referenceId: 'res-unit-1',
    referenceType: 'reservation',
    timestamp: '2026-05-10T14:00:00.000Z',
    details: 'Reservou o espaço B1-01 em 10/06/2097 (08:00-10:00)',
    space: { id: 'a1a00001-0000-4000-8000-000000000000', name: 'Sala de Leitura', number: 'B1-01' },
    targetDate: '2097-06-10',
    targetEndDate: null,
    startTime: '08:00',
    endTime: '10:00',
    reservationId: 'res-unit-1',
    recurrenceId: null,
  },
  {
    id: 'log-2',
    userId: '00000000-0000-0000-0000-000000000002',
    actor: { id: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa' },
    actionType: 'create_blocking',
    referenceId: 'blk-1',
    referenceType: 'blocking',
    timestamp: '2026-05-11T15:30:00.000Z',
    details: 'Bloqueou o espaço B1-02 em 2097-06-12 (18:00-20:00): Manutenção',
    space: { id: 'a1a00002-0000-4000-8000-000000000000', name: 'LEAU', number: 'B1-02' },
    targetDate: '2097-06-12',
    targetEndDate: null,
    startTime: '18:00',
    endTime: '20:00',
    reservationId: null,
    recurrenceId: null,
  },
];

const ACTORS_FIXTURE = [
  { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa' },
];

async function mockLogsEndpoint(page: Page) {
  await page.route('**/api/v1/logs**', async (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('userId');
    const actionType = url.searchParams.get('actionType');
    const filtered = LOGS_FIXTURE.filter((item) => {
      if (userId && item.userId !== userId) return false;
      if (actionType && item.actionType !== actionType) return false;
      return true;
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: filtered,
        pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 },
        actors: ACTORS_FIXTURE,
      }),
    });
  });
}

async function assertForbiddenForRole(page: Page) {
  await gotoCampusAfterRouterSettles(page);
  await page.waitForURL(/#\/campus/, { timeout: 5000 });
  await expect(page.locator('a[href="#/historico-acoes"]')).toHaveCount(0);

  await page.goto('/#/historico-acoes');
  await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
}

test.describe('Histórico de ações (/historico-acoes)', () => {
  test('staff: navegação exibe entrada, tela lista ações com link para reserva e filtra por pessoa', async ({
    staffPage: page,
  }) => {
    await mockLogsEndpoint(page);
    await gotoCampusAfterRouterSettles(page);
    await expect(page.locator('a[href="#/historico-acoes"]').first()).toBeAttached();

    await page.goto('/#/historico-acoes');
    await expect(page.getByRole('heading', { name: 'Histórico de ações' })).toBeVisible();

    const cards = page.getByTestId('action-history-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).getByTestId('action-history-actor')).toContainText('Carlos Oliveira');
    await expect(cards.nth(0).getByTestId('action-history-action')).toContainText('Reserva criada');
    await expect(cards.nth(0).getByTestId('action-history-space')).toContainText('Sala de Leitura (B1-01)');
    await expect(cards.nth(0).getByTestId('action-history-reservation-link')).toBeVisible();
    await expect(cards.nth(1).getByTestId('action-history-reservation-link')).toHaveCount(0);

    await page.getByTestId('open-action-history-filters').click();
    await page.locator('#action-history-actor').selectOption('00000000-0000-0000-0000-000000000003');
    await page.getByRole('button', { name: 'Ver ações' }).click();

    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId('action-history-active-filter-chip')).toContainText('Pessoa: Carlos Oliveira');
  });

  test('student: navegação oculta a entrada e rota redireciona para /campus', async ({ studentPage: page }) => {
    await assertForbiddenForRole(page);
  });

  test('professor: navegação oculta a entrada e rota redireciona para /campus', async ({ professorPage: page }) => {
    await assertForbiddenForRole(page);
  });

  test('maintenance: navegação oculta a entrada e rota redireciona para /campus', async ({
    maintenancePage: page,
  }) => {
    await assertForbiddenForRole(page);
  });
});
