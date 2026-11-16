import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../../..');
const readRepo = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

interface OklchColor {
  L: number;
  C: number;
  h: number;
  alpha: number;
}

interface LinearRgb {
  rLin: number;
  gLin: number;
  bLin: number;
  rSrgb: number;
  gSrgb: number;
  bSrgb: number;
}

function parseOklch(raw: string): OklchColor {
  const match = raw.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/);
  if (!match) throw new Error(`Expected oklch(...) color, got: ${raw}`);
  const alphaRaw = match[4];
  const alpha = alphaRaw === undefined
    ? 1
    : alphaRaw.endsWith('%')
      ? Number.parseFloat(alphaRaw) / 100
      : Number.parseFloat(alphaRaw);
  return {
    L: Number.parseFloat(match[1]),
    C: Number.parseFloat(match[2]),
    h: Number.parseFloat(match[3]),
    alpha,
  };
}

function oklchToLinearRgb({ L, C, h }: OklchColor): LinearRgb {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const rLin = Math.max(0, Math.min(1, +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s));
  const gLin = Math.max(0, Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s));
  const bLin = Math.max(0, Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s));
  const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  return { rLin, gLin, bLin, rSrgb: toSrgb(rLin), gSrgb: toSrgb(gLin), bSrgb: toSrgb(bLin) };
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function compositeOver(fg: OklchColor, bg: LinearRgb, extraAlpha = 1): LinearRgb {
  const alpha = fg.alpha * extraAlpha;
  const fgRgb = oklchToLinearRgb(fg);
  if (alpha >= 1) return fgRgb;
  const rSrgb = fgRgb.rSrgb * alpha + bg.rSrgb * (1 - alpha);
  const gSrgb = fgRgb.gSrgb * alpha + bg.gSrgb * (1 - alpha);
  const bSrgb = fgRgb.bSrgb * alpha + bg.bSrgb * (1 - alpha);
  return {
    rLin: srgbToLinear(rSrgb),
    gLin: srgbToLinear(gSrgb),
    bLin: srgbToLinear(bSrgb),
    rSrgb,
    gSrgb,
    bSrgb,
  };
}

function relativeLuminance(rgb: LinearRgb): number {
  return 0.2126 * rgb.rLin + 0.7152 * rgb.gLin + 0.0722 * rgb.bLin;
}

function contrastRatio(fg: OklchColor, bg: OklchColor, extraFgAlpha = 1): number {
  const bgRgb = oklchToLinearRgb(bg);
  const fgRgb = compositeOver(fg, bgRgb, extraFgAlpha);
  const l1 = relativeLuminance(fgRgb);
  const l2 = relativeLuminance(bgRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function extractThemeBlock(css: string, selector: ':root' | '.dark'): Record<string, string> {
  const escaped = selector === ':root' ? ':root' : '\\.dark';
  const blockMatch = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!blockMatch) throw new Error(`Missing block for ${selector}`);
  const vars: Record<string, string> = {};
  for (const line of blockMatch[1].split('\n')) {
    const varMatch = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (varMatch) vars[varMatch[1]] = varMatch[2].trim();
  }
  return vars;
}

describe('design tokens contrast & accessibility invariants', () => {
  const tokensCss = readRepo('src/styles/tokens.css');
  const lightVars = extractThemeBlock(tokensCss, ':root');
  const darkVars = extractThemeBlock(tokensCss, '.dark');

  it('meets >= 4.5:1 for --muted-foreground across light and dark surfaces', () => {
    const surfaces = ['--background', '--card', '--popover', '--muted', '--secondary'] as const;

    const lightFg = parseOklch(lightVars['--muted-foreground']);
    for (const surface of surfaces) {
      const ratio = contrastRatio(lightFg, parseOklch(lightVars[surface]));
      expect(ratio, `light --muted-foreground on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }

    const darkFg = parseOklch(darkVars['--muted-foreground']);
    for (const surface of surfaces) {
      const ratio = contrastRatio(darkFg, parseOklch(darkVars[surface]));
      expect(ratio, `dark --muted-foreground on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets >= 3:1 for --field-border across light and dark surfaces', () => {
    const surfaces = ['--background', '--card', '--popover', '--muted', '--secondary'] as const;

    const lightBorder = parseOklch(lightVars['--field-border']);
    for (const surface of surfaces) {
      const ratio = contrastRatio(lightBorder, parseOklch(lightVars[surface]));
      expect(ratio, `light --field-border on ${surface}`).toBeGreaterThanOrEqual(3);
    }
    expect(lightVars['--field-border']).not.toBe(lightVars['--border']);

    const darkBorder = parseOklch(darkVars['--field-border']);
    for (const surface of surfaces) {
      const ratio = contrastRatio(darkBorder, parseOklch(darkVars[surface]));
      expect(ratio, `dark --field-border on ${surface}`).toBeGreaterThanOrEqual(3);
    }
    const darkInput = parseOklch(darkVars['--input']);
    const darkCardRgb = oklchToLinearRgb(parseOklch(darkVars['--card']));
    const inputFillOnCard = compositeOver(darkInput, darkCardRgb, 0.3);
    const borderRgb = oklchToLinearRgb(darkBorder);
    const l1 = relativeLuminance(borderRgb);
    const l2 = relativeLuminance(inputFillOnCard);
    expect((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), 'dark --field-border vs bg-input/30').toBeGreaterThanOrEqual(3);
  });

  it('meets >= 3:1 for ScrollBar thumb (bg-muted-foreground/70) in both themes', () => {
    const scrollBar = readRepo('src/components/ui/scroll-area/ScrollBar.vue');
    expect(scrollBar).toContain('bg-muted-foreground/70');

    expect(
      contrastRatio(parseOklch(lightVars['--muted-foreground']), parseOklch(lightVars['--background']), 0.7),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(parseOklch(darkVars['--muted-foreground']), parseOklch(darkVars['--card']), 0.7),
    ).toBeGreaterThanOrEqual(3);
  });

  it('uses rem-based bar heights and removes the global reduced-motion kill-switch', () => {
    expect(tokensCss).toMatch(/--top-bar-h:\s*[\d.]+rem/);
    expect(tokensCss).toMatch(/--bottom-bar-h:\s*[\d.]+rem/);
    expect(tokensCss).not.toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(tokensCss).not.toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it('uses scalable typography and min-height primitives without clipping', () => {
    const baseCss = readRepo('src/styles/base.css');
    const publicCss = readRepo('public/styles.css');
    const buttonVariants = readRepo('src/components/ui/button/index.ts');
    const badgeVariants = readRepo('src/components/ui/badge/index.ts');
    const rail = readRepo('src/components/ViewerControlsRail.vue');
    const desktopControls = readRepo('src/components/ViewerDesktopControls.vue');

    expect(baseCss).toContain('font-size-adjust: from-font');
    expect(baseCss).toContain('text-wrap: balance');
    expect(baseCss).toContain('text-wrap: pretty');
    expect(baseCss).not.toMatch(/font-size:\s*16px/);
    expect(publicCss).toContain('font-size-adjust: from-font');

    expect(buttonVariants).not.toMatch(/['"]h-[6789]\b/);
    expect(buttonVariants).toContain('min-h-8');
    expect(buttonVariants).toContain('border-field-border');
    expect(badgeVariants).toContain('min-h-5');
    expect(badgeVariants).not.toContain('overflow-hidden');

    expect(rail).not.toMatch(/font-size:\s*\d+px/);
    expect(desktopControls).not.toMatch(/font-size:\s*\d+px/);
  });

  it('provides static busy indicators and keeps color transitions under reduced motion', () => {
    const equipmentDialog = readRepo('src/components/EquipmentReportDialog.vue');
    const viewerView = readRepo('src/views/ViewerView.vue');
    const spaceCard = readRepo('src/components/SpaceCard.vue');
    const statefulBtn = readRepo('src/components/StatefulActionButton.vue');

    expect(equipmentDialog).toContain('Enviando…');
    expect(equipmentDialog).toContain(':aria-busy="loading"');
    expect(viewerView).toContain('Carregando maquete 3D…');
    expect(viewerView).toContain('aria-busy="true"');
    expect(spaceCard).toContain('Carregando…');
    expect(statefulBtn).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*background-color/);
  });
});
