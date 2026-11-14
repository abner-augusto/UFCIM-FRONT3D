import { test, expect } from './fixtures';

const MODEL_ID = 'Sala de Leitura (Biblioteca)';

test('menu expõe estado e avatar móvel tem nome acessível', async ({ staffPage: page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto('/#/campus');
  const menu = page.locator('.hamburger-btn');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-actions').getByRole('link', { name: 'Perfil', exact: true })).toBeVisible();
});

for (const viewport of [{ width: 800, height: 800 }, { width: 390, height: 844 }]) {
  test(`overlays têm descrição sem avisos (${viewport.width}px)`, async ({ staffPage: page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (/description/i.test(message.text()) && /missing|warning|undefined/i.test(message.text())) warnings.push(message.text());
    });
    await page.setViewportSize(viewport);
    await page.goto('/#/campus/benfica/viewer');
    if (viewport.width > 480) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: 'Abrir notificações' }).click();
    await expect(page.getByRole('dialog', { name: 'Notificações' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const viewer = (window as unknown as { __ufcimViewer?: { listRooms?: () => unknown[] } }).__ufcimViewer;
      return (viewer?.listRooms?.().length ?? 0) > 0;
    }, null, { timeout: 20_000 });
    await page.evaluate((modelId) => {
      const viewer = (window as unknown as { __ufcimViewer?: { openRoom?: (id: string) => void } }).__ufcimViewer;
      viewer?.openRoom?.(modelId);
    }, MODEL_ID);
    await expect(page.getByRole('button', { name: 'Fechar popup' })).toBeVisible({ timeout: 20_000 });
    expect(warnings).toEqual([]);
  });
}

test('Tab e Enter abrem o relatório de uma sala', async ({ staffPage: page }) => {
  await page.goto('/#/relatorios');
  const region = page.getByRole('region', { name: 'Detalhamento por Sala' });
  const link = region.getByRole('link').first();
  await expect(link).toBeVisible({ timeout: 20_000 });
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  await region.focus();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});
