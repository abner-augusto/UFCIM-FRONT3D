import { describe, expect, it, vi } from 'vitest';

const { routes, hooks } = vi.hoisted(() => ({ routes: [] as Array<{ meta?: { title?: string }; redirect?: string }>, hooks: [] as Array<(to: unknown, from: unknown, failure?: unknown) => Promise<void>> }));
vi.mock('vue-router', () => ({
  createWebHashHistory: () => ({}),
  createRouter: (config: { routes: typeof routes }) => {
    routes.push(...config.routes);
    return { beforeEach: vi.fn(), afterEach: (hook: typeof hooks[number]) => hooks.push(hook) };
  },
}));
import '@/router';

describe('títulos das rotas', () => {
  it('define título nas rotas que exibem páginas e atualiza o documento', async () => {
    expect(routes.every((route) => route.meta?.title)).toBe(true);
    const document = { title: '' };
    vi.stubGlobal('document', document);
    await hooks[0]!({ meta: { title: 'Notificações' } }, { matched: [] });
    expect(document.title).toBe('Notificações – UFCIM');
    vi.unstubAllGlobals();
  });
});
