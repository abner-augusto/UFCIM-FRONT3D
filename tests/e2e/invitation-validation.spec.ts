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
