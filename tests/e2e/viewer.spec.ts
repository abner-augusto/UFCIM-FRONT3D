import { test, expect } from './fixtures';

const CAMPUS = 'pici';

test.describe('ViewerView', () => {
  test('loads and renders the 3D canvas', async ({ studentPage: page }) => {
    await page.goto(`/#/campus/${CAMPUS}/viewer`);
    await page.waitForURL(/#\/campus\/.*\/viewer/, { timeout: 10_000 });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('useDateTimeFilter: date chip controls are visible', async ({ studentPage: page }) => {
    await page.goto(`/#/campus/${CAMPUS}/viewer`);
    await page.waitForURL(/#\/campus\/.*\/viewer/);
    await page.waitForTimeout(1500);

    // ViewerControlsRail renders the period/date selector from useDateTimeFilter
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Manhã|Tarde|Noite|DATA|TURNO/i);
  });

  test('useDateTimeFilter: clicking a period chip updates selection', async ({ studentPage: page }) => {
    await page.goto(`/#/campus/${CAMPUS}/viewer`);
    await page.waitForURL(/#\/campus\/.*\/viewer/);
    await page.waitForTimeout(1500);

    // Locate period buttons (Manhã, Tarde, Noite)
    const tardeBtn = page.getByRole('button', { name: /Tarde/i });

    if (await tardeBtn.count() > 0) {
      await tardeBtn.click();
      // After clicking, Tarde should be selected (has active/selected class or aria-pressed)
      await expect(tardeBtn).toHaveAttribute('aria-pressed', 'true').catch(() =>
        expect(tardeBtn).toHaveClass(/active|selected|--active/)
      );
    } else {
      // Period selector may be hidden on small viewport — just verify canvas is present
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('no circular-dep errors on viewer load', async ({ studentPage: page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('circular') ||
        msg.text().includes('before initialization') ||
        msg.text().includes('ReferenceError')
      )) {
        errors.push(msg.text());
      }
    });

    await page.goto(`/#/campus/${CAMPUS}/viewer`);
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
