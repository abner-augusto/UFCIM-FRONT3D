import { describe, expect, it } from 'vitest';

// Guards for the invariants in AGENTS.md that are import- or call-shape rules.
// Reading source as raw text keeps this independent of the Vue/Three runtime.
const sources = import.meta.glob<string>('/src/**/*.{ts,js,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function filesWhere(
  include: (path: string) => boolean,
  pattern: RegExp,
): string[] {
  return Object.entries(sources)
    .filter(([path, text]) => include(path) && pattern.test(text))
    .map(([path]) => path);
}

describe('architecture', () => {
  it('has source files to check', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  it('keeps src/three free of Vue, Pinia and app-layer imports', () => {
    const appLayer =
      /from\s+['"](vue|pinia|vue-router|@\/(components|views|stores|services|composables|router))/;
    expect(filesWhere((p) => p.startsWith('/src/three/'), appLayer)).toEqual(
      [],
    );
  });

  it('sends backend requests only through services/api.ts', () => {
    // src/three loads static manifest and GLB assets, not backend data.
    expect(
      filesWhere(
        (p) => p !== '/src/services/api.ts' && !p.startsWith('/src/three/'),
        /\bfetch\s*\(/,
      ),
    ).toEqual([]);
  });

  it('uses localStorage only for the theme preference', () => {
    expect(
      filesWhere((p) => p !== '/src/composables/useDarkMode.ts', /localStorage/),
    ).toEqual([]);
  });
});
