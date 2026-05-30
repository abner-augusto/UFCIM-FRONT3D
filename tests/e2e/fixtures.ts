import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Role = 'student' | 'professor' | 'staff' | 'maintenance';

// Matches seed.sql + generate-test-token.mjs
const SEED_USERS: Record<Role, { id: string; name: string; email: string; registration: string; role: Role; isMasterAdmin: boolean }> = {
  student:     { id: '00000000-0000-0000-0000-000000000001', name: 'João Silva',       email: 'joao.silva@alu.ufc.br',  registration: '2023001001', role: 'student',     isMasterAdmin: false },
  professor:   { id: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa', email: 'maria.costa@ufc.br',      registration: '1998010001', role: 'professor',   isMasterAdmin: false },
  staff:       { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira',  email: 'carlos.oliveira@ufc.br', registration: '2010005001', role: 'staff',       isMasterAdmin: false },
  maintenance: { id: '00000000-0000-0000-0000-000000000004', name: 'Pedro Santos',     email: 'pedro.santos@ufc.br',    registration: '2015002001', role: 'maintenance', isMasterAdmin: false },
};

function loadTokens(): Record<string, string> {
  const p = path.resolve(__dirname, '.auth', 'tokens.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}


async function createAuthContext(browser: import('@playwright/test').Browser, role: Role): Promise<BrowserContext> {
  const tokens = loadTokens();
  const token = tokens[role];
  const user = SEED_USERS[role];

  const context = await browser.newContext();

  // Set token before Vue/Pinia initialize
  await context.addInitScript((t: string) => {
    sessionStorage.setItem('ufcim_token', t);
  }, token);

  // Mock GET /api/v1/users/me so main.ts hydrates the auth store without
  // depending on backend response timing (the real backend handles all other requests).
  await context.route('**/api/v1/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...user, unreadCount: 0 }),
    })
  );

  return context;
}

type AuthFixtures = {
  studentPage: Page;
  professorPage: Page;
  staffPage: Page;
  maintenancePage: Page;
};

export const test = base.extend<AuthFixtures>({
  studentPage: async ({ browser }, use) => {
    const ctx = await createAuthContext(browser, 'student');
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  professorPage: async ({ browser }, use) => {
    const ctx = await createAuthContext(browser, 'professor');
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  staffPage: async ({ browser }, use) => {
    const ctx = await createAuthContext(browser, 'staff');
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  maintenancePage: async ({ browser }, use) => {
    const ctx = await createAuthContext(browser, 'maintenance');
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect };
