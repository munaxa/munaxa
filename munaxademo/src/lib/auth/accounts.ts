/**
 * In-memory demo-account store. NO database: accounts live in a module-level Map,
 * seeded from src/seed/accounts.ts at boot. Admin-created accounts persist only until
 * the server restarts. Passwords are PBKDF2-hashed (never kept as plaintext at rest).
 */
import { SEED_ACCOUNTS } from '@/seed/accounts';
import type { PersonaId } from '@/lib/rbac';

export interface DemoAccount {
  id: string;
  organizationName: string; // school name
  username: string;
  passwordHash: string;
  createdAt: string;
  expiresAt: string | null;
  status: 'ACTIVE' | 'DISABLED';
  admin: boolean;
  /** Assigned persona for prospect accounts; admins have none (free switching). */
  role: PersonaId | null;
}

/** Configurable default expiry (days) for newly provisioned demo accounts. */
export function defaultExpiryDays(): number {
  const v = Number(process.env.DEMO_DEFAULT_EXPIRY_DAYS);
  return Number.isFinite(v) && v > 0 ? v : 14;
}

export interface LoginEvent {
  id: string;
  accountId: string;
  username: string;
  at: string;
  outcome: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'DISABLED';
  ip: string;
}

const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000;

function b64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function unb64(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string, salt?: Uint8Array): Promise<string> {
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: s as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(s)}$${b64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const salt = unb64(parts[2]!);
  const expected = parts[3]!;
  const candidate = await hashPassword(password, salt);
  const candHash = candidate.split('$')[3]!;
  // Constant-time-ish comparison.
  if (candHash.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= candHash.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/* ── Module-level singletons (survive across requests, reset on server restart). ── */
interface Store {
  accounts: Map<string, DemoAccount>;
  history: LoginEvent[];
  seq: number;
}

const g = globalThis as unknown as { __munaxaDemoStore?: Store; __munaxaDemoInit?: Promise<void> };

function store(): Store {
  if (!g.__munaxaDemoStore) {
    g.__munaxaDemoStore = { accounts: new Map(), history: [], seq: 0 };
  }
  return g.__munaxaDemoStore;
}

async function ensureSeeded(): Promise<void> {
  if (!g.__munaxaDemoInit) {
    g.__munaxaDemoInit = (async () => {
      const s = store();
      const now = Date.now();
      let i = 0;
      for (const seed of SEED_ACCOUNTS) {
        const id = `acct-${++i}`;
        s.accounts.set(id, {
          id,
          organizationName: seed.organizationName,
          username: seed.username.toLowerCase(),
          passwordHash: await hashPassword(seed.password),
          createdAt: new Date(now).toISOString(),
          expiresAt:
            seed.expiresInDays === null
              ? null
              : new Date(now + seed.expiresInDays * 86_400_000).toISOString(),
          status: seed.status,
          admin: Boolean(seed.admin),
          role: seed.role ?? null,
        });
      }
      s.seq = i;
    })();
  }
  return g.__munaxaDemoInit;
}

export async function listAccounts(): Promise<DemoAccount[]> {
  await ensureSeeded();
  return [...store().accounts.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAccountByUsername(username: string): Promise<DemoAccount | undefined> {
  await ensureSeeded();
  const u = username.trim().toLowerCase();
  return [...store().accounts.values()].find((a) => a.username === u);
}

export async function getAccount(id: string): Promise<DemoAccount | undefined> {
  await ensureSeeded();
  return store().accounts.get(id);
}

export function isExpired(a: DemoAccount): boolean {
  return a.expiresAt !== null && new Date(a.expiresAt).getTime() < Date.now();
}

export async function createAccount(input: {
  organizationName: string;
  username: string;
  password: string;
  expiresInDays: number | null;
  role: PersonaId | null;
}): Promise<DemoAccount> {
  await ensureSeeded();
  const s = store();
  const username = input.username.trim().toLowerCase();
  if ([...s.accounts.values()].some((a) => a.username === username)) {
    throw new Error('Username already exists');
  }
  const id = `acct-${++s.seq}`;
  const acct: DemoAccount = {
    id,
    organizationName: input.organizationName.trim(),
    username,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
    expiresAt:
      input.expiresInDays === null
        ? null
        : new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString(),
    status: 'ACTIVE',
    admin: false,
    role: input.role,
  };
  s.accounts.set(id, acct);
  return acct;
}

export async function updateAccount(
  id: string,
  patch: Partial<Pick<DemoAccount, 'status' | 'expiresAt'>>,
): Promise<DemoAccount | undefined> {
  await ensureSeeded();
  const acct = store().accounts.get(id);
  if (!acct) return undefined;
  if (patch.status) acct.status = patch.status;
  if (patch.expiresAt !== undefined) acct.expiresAt = patch.expiresAt;
  return acct;
}

export async function deleteAccount(id: string): Promise<boolean> {
  await ensureSeeded();
  const acct = store().accounts.get(id);
  if (!acct || acct.admin) return false; // never delete the admin account
  return store().accounts.delete(id);
}

export async function recordLogin(ev: Omit<LoginEvent, 'id' | 'at'>): Promise<void> {
  await ensureSeeded();
  const s = store();
  s.history.unshift({ ...ev, id: `login-${++s.seq}`, at: new Date().toISOString() });
  if (s.history.length > 500) s.history.length = 500;
}

export async function loginHistory(accountId?: string): Promise<LoginEvent[]> {
  await ensureSeeded();
  const all = store().history;
  return accountId ? all.filter((e) => e.accountId === accountId) : all;
}
