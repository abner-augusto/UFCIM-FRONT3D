import { test, expect, gotoCampusAfterRouterSettles } from './fixtures';

const UNIT_RESERVATIONS_FIXTURE = [
  {
    id: 'res-unit-1',
    spaceId: 'a1a00001-0000-4000-8000-000000000000',
    userId: '00000000-0000-0000-0000-000000000003',
    createdBy: '00000000-0000-0000-0000-000000000003',
    date: '2097-06-10',
    startTime: '08:00',
    endTime: '10:00',
    status: 'confirmed',
    changeOrigin: null,
    recurrenceId: null,
    purpose: 'class',
    description: 'Ateliê de Projeto',
    requesterContact: '85 99999-0001',
    requester: { userId: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa' },
    registeredBy: { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira' },
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    space: {
      id: 'a1a00001-0000-4000-8000-000000000000',
      name: 'Sala de Leitura',
      number: 'B1-01',
      block: 'Bloco 1',
      campus: 'Benfica',
      type: 'study_room',
      capacity: 50,
      department: 'iaud',
    },
  },
  {
    id: 'res-unit-2',
    spaceId: 'a1a00002-0000-4000-8000-000000000000',
    userId: '00000000-0000-0000-0000-000000000002',
    createdBy: '00000000-0000-0000-0000-000000000002',
    date: '2097-06-12',
    startTime: '14:00',
    endTime: '16:00',
    status: 'confirmed',
    changeOrigin: null,
    recurrenceId: null,
    purpose: 'meeting',
    description: 'Reunião de colegiado',
    requester: null,
    registeredBy: { id: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa' },
    createdAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    space: {
      id: 'a1a00002-0000-4000-8000-000000000000',
      name: 'LEAU',
      number: 'B1-02',
      block: 'Bloco 1',
      campus: 'Benfica',
      type: 'study_room',
      capacity: 20,
      department: 'iaud',
    },
  },
];

const SPACES_FIXTURE = [
  { id: 'a1a00001-0000-4000-8000-000000000000', name: 'Sala de Leitura', number: 'B1-01' },
  { id: 'a1a00002-0000-4000-8000-000000000000', name: 'LEAU', number: 'B1-02' },
];

const CREATORS_FIXTURE = [
  { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa' },
];

test.describe('Reservas da unidade (/reservas-da-unidade)', () => {
  test('staff: navegação exibe a entrada e tela lista reservas com quem registrou, solicitante e filtro Registrada por', async ({
    staffPage: page,
  }) => {
    await page.route('**/api/v1/reservations/department**', async (route) => {
      const url = new URL(route.request().url());
      const createdBy = url.searchParams.get('createdBy');
      const filtered = createdBy
        ? UNIT_RESERVATIONS_FIXTURE.filter((r) => r.createdBy === createdBy)
        : UNIT_RESERVATIONS_FIXTURE;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: filtered,
          pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 },
          spaces: SPACES_FIXTURE,
          creators: CREATORS_FIXTURE,
        }),
      });
    });

    await gotoCampusAfterRouterSettles(page);
    await expect(page.locator('a[href="#/reservas-da-unidade"]').first()).toBeAttached();

    await page.goto('/#/reservas-da-unidade');
    await expect(page).toHaveURL(/#\/reservas-da-unidade/);
    await expect(page.getByRole('heading', { name: 'Reservas da unidade' })).toBeVisible();

    const cards = page.getByTestId('unit-reservation-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).getByTestId('unit-reservation-registered-by')).toContainText('Carlos Oliveira');
    await expect(cards.nth(0).getByTestId('unit-reservation-requester')).toContainText('Dra. Maria Costa');
    await expect(cards.nth(1).getByTestId('unit-reservation-registered-by')).toContainText('Dra. Maria Costa');
    await expect(cards.nth(1).getByTestId('unit-reservation-requester')).toContainText('Dra. Maria Costa');

    await page.getByTestId('open-unit-reservation-filters').click();
    await page.locator('#unit-reservations-creator').selectOption('00000000-0000-0000-0000-000000000003');
    await page.getByRole('button', { name: 'Ver reservas' }).click();

    await expect(cards).toHaveCount(1);
    await expect(cards.nth(0)).toContainText('Ateliê de Projeto');
    await expect(page.getByTestId('unit-active-filter-chip')).toContainText('Registrada por: Carlos Oliveira');
  });

  test('student: navegação oculta a entrada e rota redireciona para /campus', async ({ studentPage: page }) => {
    await gotoCampusAfterRouterSettles(page);
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await expect(page.locator('a[href="#/reservas-da-unidade"]')).toHaveCount(0);

    await page.goto('/#/reservas-da-unidade');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
  });

  test('professor: navegação oculta a entrada e rota redireciona para /campus', async ({ professorPage: page }) => {
    await gotoCampusAfterRouterSettles(page);
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await expect(page.locator('a[href="#/reservas-da-unidade"]')).toHaveCount(0);

    await page.goto('/#/reservas-da-unidade');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
  });

  test('maintenance: navegação oculta a entrada e rota redireciona para /campus', async ({
    maintenancePage: page,
  }) => {
    await gotoCampusAfterRouterSettles(page);
    await page.waitForURL(/#\/campus/, { timeout: 5000 });
    await expect(page.locator('a[href="#/reservas-da-unidade"]')).toHaveCount(0);

    await page.goto('/#/reservas-da-unidade');
    await expect(page).toHaveURL(/#\/campus/, { timeout: 5000 });
  });
});
