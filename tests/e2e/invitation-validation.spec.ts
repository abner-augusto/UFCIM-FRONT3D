import { test, expect } from '@playwright/test';

test('aceitar convite foca o primeiro campo inválido', async ({ page }) => {
  await page.route('**/auth/invitations/test-token', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, role: 'student', inviterName: 'Professor' }),
  }));
  await page.goto('/#/convite/test-token');
  await page.getByRole('button', { name: 'Ativar conta' }).click();
  await expect(page.locator('#invite-registration')).toBeFocused();
  await expect(page.getByText('A matrícula é obrigatória para alunos.')).toBeVisible();
  await page.locator('#invite-registration').fill('12345');
  await page.getByRole('button', { name: 'Ativar conta' }).click();
  await expect(page.locator('#invite-password')).toBeFocused();
});

test('botão mostrar/ocultar senha alterna tipo do campo e nome acessível', async ({ page }) => {
  await page.route('**/auth/invitations/test-token', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, role: 'student', inviterName: 'Professor' }),
  }));
  await page.goto('/#/convite/test-token');

  const passwordInput = page.locator('#invite-password');
  await expect(passwordInput).toHaveAttribute('type', 'password');
  await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.getByLabel('Confirmar senha')).toHaveCount(0);

  const showButton = page.getByRole('button', { name: 'Mostrar senha' });
  await expect(showButton).toHaveAttribute('aria-pressed', 'false');
  await showButton.click();

  await expect(passwordInput).toHaveAttribute('type', 'text');
  const hideButton = page.getByRole('button', { name: 'Ocultar senha' });
  await expect(hideButton).toHaveAttribute('aria-pressed', 'true');
  await hideButton.click();

  await expect(passwordInput).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toHaveAttribute('aria-pressed', 'false');
});

test('aceitar convite com um campo de senha funciona até o login', async ({ page }) => {
  await page.route('**/auth/invitations/test-token', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, role: 'student', inviterName: 'Professor' }),
  }));

  let acceptPayload: Record<string, unknown> | null = null;
  await page.route('**/auth/invitations/test-token/accept', async (route) => {
    acceptPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'fake-access-token',
        refreshToken: 'fake-refresh-token',
        user: {
          id: '00000000-0000-0000-0000-000000000099',
          name: 'Novo Aluno',
          email: 'novo@alu.ufc.br',
          registration: '2026001234',
          role: 'student',
          department: null,
          isMasterAdmin: false,
          unreadCount: 0,
        },
      }),
    });
  });

  await page.goto('/#/convite/test-token');
  await expect(page.getByLabel('Confirmar senha')).toHaveCount(0);

  await page.locator('#invite-registration').fill('2026001234');
  await page.locator('#invite-password').fill('Senha123');
  await page.getByRole('button', { name: 'Ativar conta' }).click();

  await expect(page).toHaveURL(/#\/campus/);
  await expect(page.getByRole('heading', { name: 'Selecione seu campus' })).toBeVisible();
  expect(acceptPayload).toEqual({ password: 'Senha123', registration: '2026001234' });
});
