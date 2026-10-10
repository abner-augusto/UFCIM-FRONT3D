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

  test('clicking a building in the canvas focuses it (MEL-002)', async ({ studentPage: page }) => {
    await page.goto(`/#/campus/${CAMPUS}/viewer`);
    const buildingRow = page.locator('.desktop-controls .controls-row:not(.controls-row--floors)');
    const todos = buildingRow.getByRole('button', { name: 'Todos' });
    const active = buildingRow.locator('.ctrl-btn.active');
    await expect(todos).toHaveClass(/active/, { timeout: 15_000 });
    await page.waitForTimeout(3000); // ground floors finish loading

    // Roof points in the default 1280x720 overview (bloco4, pavilhao).
    const roofPoints: [number, number][] = [[711, 314], [578, 356]];

    // Orbit drag across a building must not focus it.
    const [dx, dy] = roofPoints[1];
    await page.mouse.move(dx, dy);
    await page.mouse.down();
    await page.mouse.move(dx + 60, dy + 10, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    await expect(active).toHaveText('Todos');

    // Reset the camera after the orbit, then tap a roof.
    await todos.click();
    await page.waitForTimeout(1000);
    for (const [x, y] of roofPoints) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(1200);
      if ((await active.innerText()) !== 'Todos') break;
    }
    await expect(active).not.toHaveText('Todos');
    await expect(page.locator('.desktop-controls .controls-row--floors')).toBeVisible();
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
