import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../public/_worker.js';

afterEach(() => vi.unstubAllGlobals());

describe('Pages worker', () => {
  it('adds security headers to assets while preserving cache behavior', async () => {
    const env = { ASSETS: { fetch: vi.fn().mockImplementation(() => new Response('asset', { status: 404, headers: { 'Cache-Control': 'max-age=60' } })) } };
    const response = await worker.fetch(new Request('https://example.com/app.js'), env);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('asset');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('Permissions-Policy')).toBe('camera=(), geolocation=(), microphone=()');
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toBe("default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    expect(response.headers.get('Cache-Control')).toBe('max-age=60');
    const html = await worker.fetch(new Request('https://example.com/'), env);
    expect(html.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });

  it('returns the backend response unchanged for API and auth requests', async () => {
    const backend = new Response('backend', { status: 202, headers: { 'X-Backend': 'yes' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(backend));
    const env = { ASSETS: { fetch: vi.fn() } };
    for (const path of ['/api/v1/spaces', '/auth/login']) {
      expect(await worker.fetch(new Request(`https://example.com${path}`), env)).toBe(backend);
    }
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
