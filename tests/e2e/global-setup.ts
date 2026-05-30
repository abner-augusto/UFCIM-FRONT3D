import { execSync } from 'child_process';
import { createHmac } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..', '..', '..', 'ufcim-backend-proto');
const AUTH_DIR = path.resolve(__dirname, '.auth');
const ROLES = ['student', 'professor', 'staff', 'maintenance'] as const;

// Must match wrangler.toml [env.dev] JWT_ISSUER and .dev.vars JWT_SIGNING_SECRET.
const JWT_ISSUER = 'http://localhost:8787';
const JWT_SIGNING_SECRET = 'dev-only-secret-not-for-production-use-do-not-leak';

const SEED_USERS = {
  student:     { sub: '00000000-0000-0000-0000-000000000001', name: 'João Silva',       email: 'joao.silva@alu.ufc.br',  registration: '2023001001', department: 'Ciência da Computação', role: 'ufcim-student' },
  professor:   { sub: '00000000-0000-0000-0000-000000000002', name: 'Dra. Maria Costa', email: 'maria.costa@ufc.br',      registration: '1998010001', department: 'Ciência da Computação', role: 'ufcim-professor' },
  staff:       { sub: '00000000-0000-0000-0000-000000000003', name: 'Carlos Oliveira',  email: 'carlos.oliveira@ufc.br', registration: '2010005001', department: 'Administração',          role: 'ufcim-staff' },
  maintenance: { sub: '00000000-0000-0000-0000-000000000004', name: 'Pedro Santos',     email: 'pedro.santos@ufc.br',    registration: '2015002001', department: 'Manutenção',             role: 'ufcim-maintenance' },
};

function b64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function makeHS256JWT(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = b64url(createHmac('sha256', JWT_SIGNING_SECRET).update(signingInput).digest());
  return `${signingInput}.${sig}`;
}

export default async function globalSetup() {
  mkdirSync(AUTH_DIR, { recursive: true });

  // Seed the local D1 database (INSERT OR IGNORE — safe to run multiple times)
  try {
    execSync(
      'npx wrangler d1 execute ufcim-db --local --env dev --file=scripts/seed.sql',
      { cwd: BACKEND_DIR, stdio: 'pipe' }
    );
    console.log('[e2e] DB seeded');
  } catch (e: any) {
    console.warn('[e2e] DB seed warning (may already exist):', e.stderr?.toString().slice(0, 200));
  }

  // Generate HS256 dev JWTs (same algorithm as signAccessToken in the backend).
  const now = Math.floor(Date.now() / 1000);
  const tokens: Record<string, string> = {};
  for (const role of ROLES) {
    const user = SEED_USERS[role];
    tokens[role] = makeHS256JWT({
      sub: user.sub,
      name: user.name,
      email: user.email,
      preferred_username: user.registration,
      registration: user.registration,
      department: user.department,
      realm_access: { roles: [user.role] },
      iss: JWT_ISSUER,
      iat: now,
      exp: now + 24 * 60 * 60,
    });
  }

  writeFileSync(path.join(AUTH_DIR, 'tokens.json'), JSON.stringify(tokens, null, 2));
  console.log('[e2e] Tokens generated for:', Object.keys(tokens).join(', '));
}
