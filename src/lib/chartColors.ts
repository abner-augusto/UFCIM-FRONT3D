/**
 * Resolves the design-system chart/status tokens (defined in src/styles/tokens.css)
 * to concrete color strings for canvas-based charts (Chart.js), which cannot read
 * CSS custom properties directly.
 *
 * Call this inside a computed that also touches a theme signal (e.g. `isDark.value`)
 * so the chart re-resolves — and Chart.js re-renders — when the theme toggles.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartColors() {
  return {
    chart1: cssVar('--chart-1', '#1d9e75'),
    chart2: cssVar('--chart-2', '#3b82f6'),
    chart3: cssVar('--chart-3', '#ba7517'),
    chart4: cssVar('--chart-4', '#e24b4a'),
    chart5: cssVar('--chart-5', '#8b5cf6'),
    available: cssVar('--avail-free', '#00b050'),
    partial: cssVar('--avail-partial', '#f2c200'),
    reserved: cssVar('--avail-reserved', '#d32f2f'),
    blocked: cssVar('--avail-blocked', '#e8650a'),
    grid: cssVar('--border', '#e5e5e5'),
    card: cssVar('--card', '#ffffff'),
    mutedText: cssVar('--muted-foreground', '#888888'),
    foreground: cssVar('--foreground', '#222222'),
  };
}
