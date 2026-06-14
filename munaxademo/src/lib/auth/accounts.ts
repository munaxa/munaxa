/**
 * In-memory demo-account store. NO database: accounts live in a module-level Map,
 * seeded from src/seed/accounts.ts at boot. Admin-created accounts persist only until
 * the server restarts. Passwords are PBKDF2-hashed (never kept as plaintext at rest).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SEED_ACCOUNTS } from '@/seed/accounts';
import type { PersonaId } from '@/lib/rbac';

// Admin-created demo accounts are persisted to a JSON file (no database) so they
// survive server restarts. Falls back to memory-only if the filesystem is read-only.
const DATA_DIR = process.env.DEMO_DATA_DIR || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'accounts.json');

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
// OWASP-recommended work factor for PBKDF2-HMAC-SHA256 (2023+). Stored per-hash so
// the factor can be raised later without invalidating existing hashes.
const PBKDF2_ITERATIONS = 600_000;

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

export async function hashPassword(
  password: string,
  salt?: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: s as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return `pbkdf2$${iterations}$${b64(s)}$${b64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  const salt = unb64(parts[2]!);
  const expected = parts[3]!;
  // Re-derive with the SAME work factor recorded in the stored hash.
  const candidate = await hashPassword(password, salt, iterations);
  const candHash = candidate.split('$')[3]!;
  // Constant-time comparison (length-independent to avoid early-exit timing).
  const a = enc.encode(candHash);
  const b = enc.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
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

/** Write the current accounts to disk. Best-effort: ignored on read-only filesystems. */
async function persist(): Promise<void> {
  const s = store();
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const payload = JSON.stringify({ seq: s.seq, accounts: [...s.accounts.values()] }, null, 2);
    await fs.writeFile(DATA_FILE, payload, 'utf8');
  } catch {
    /* read-only / ephemeral FS — accounts remain in memory only */
  }
}

async function loadFromDisk(): Promise<{ seq: number; accounts: DemoAccount[] } | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.accounts)) {
      return { seq: Number(parsed.seq) || 0, accounts: parsed.accounts as DemoAccount[] };
    }
  } catch {
    /* missing or invalid file → fall back to seed */
  }
  return null;
}

async function buildSeedAccount(
  seed: (typeof SEED_ACCOUNTS)[number],
  id: string,
): Promise<DemoAccount> {
  const now = Date.now();
  return {
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
  };
}

async function ensureSeeded(): Promise<void> {
  if (!g.__munaxaDemoInit) {
    g.__munaxaDemoInit = (async () => {
      const s = store();
      const loaded = await loadFromDisk();
      if (loaded && loaded.accounts.length) {
        for (const a of loaded.accounts) s.accounts.set(a.id, a);
        s.seq = Math.max(loaded.seq, s.accounts.size);
        // Guarantee the built-in seed accounts (esp. the admin) always exist even if
        // an older persisted file predates them.
        let changed = false;
        for (const seed of SEED_ACCOUNTS) {
          const u = seed.username.toLowerCase();
          if (![...s.accounts.values()].some((a) => a.username === u)) {
            const acct = await buildSeedAccount(seed, `acct-${++s.seq}`);
            s.accounts.set(acct.id, acct);
            changed = true;
          }
        }
        if (changed) await persist();
        return;
      }
      // First boot: seed from file-less defaults, then write the file.
      let i = 0;
      for (const seed of SEED_ACCOUNTS) {
        const acct = await buildSeedAccount(seed, `acct-${++i}`);
        s.accounts.set(acct.id, acct);
      }
      s.seq = i;
      await persist();
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
  await persist();
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
  await persist();
  return acct;
}

export async function deleteAccount(id: string): Promise<boolean> {
  await ensureSeeded();
  const acct = store().accounts.get(id);
  if (!acct || acct.admin) return false; // never delete the admin account
  const ok = store().accounts.delete(id);
  if (ok) await persist();
  return ok;
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
