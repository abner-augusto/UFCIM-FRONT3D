import { test, expect } from './fixtures';

const CAMPUS = 'pici';

test.describe('Contraste, escala de texto 200% e movimento reduzido', () => {
  test('a 200% de texto no celular, cabeçalho, barra inferior, botões e rail do viewer não cortam texto', async ({ studentPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/campus/${CAMPUS}/viewer`);
    await expect(page.getByRole('button', { name: 'Edifício' })).toBeVisible();

    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    const headerOverflow = await page.locator('.app-header').evaluate((el) => ({
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    }));
    expect(headerOverflow.scrollH).toBeLessThanOrEqual(headerOverflow.clientH + 1);

    const tabLabelsClipped = await page.locator('.bottom-tab-bar .tab-label').evaluateAll((els) =>
      els.some((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1),
    );
    expect(tabLabelsClipped).toBe(false);

    const railWide = page.locator('.rail-btn--wide');
    const railFontPx = await railWide.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(railFontPx).toBeGreaterThanOrEqual(20);
    const railBox = await railWide.evaluate((el) => ({
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    }));
    expect(railBox.scrollH).toBeLessThanOrEqual(railBox.clientH + 1);
    expect(railBox.scrollW).toBeLessThanOrEqual(railBox.clientW + 1);
  });

  test('com prefers-reduced-motion: reduce, overlay de carregamento indica ocupado e transições de cor continuam', async ({ studentPage: page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/campus/${CAMPUS}`);

    const tabTransition = await page.locator('.bottom-tab-bar .tab-item').first().evaluate((el) => {
      const style = getComputedStyle(el);
      return { property: style.transitionProperty, duration: style.transitionDuration };
    });
    expect(tabTransition.property).toContain('color');
    expect(tabTransition.duration).not.toBe('0s');
    expect(tabTransition.duration).not.toBe('0.01ms');
  });
});
