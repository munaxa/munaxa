'use client';

/**
 * Minimal browser auth client for the Admin Portal (Phase 3).
 * Tokens are kept in sessionStorage so they are cleared when the browser/tab is closed
 * (reopening the browser therefore requires signing in again). An inactivity timeout
 * (see {@link IDLE_TIMEOUT_MS}) signs the user out after a period of no activity.
 * Production hardening (httpOnly cookies + silent refresh) is scheduled for Phase 15.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_KEY = 'munaxa.accessToken';
const REFRESH_KEY = 'munaxa.refreshToken';

/** Auto sign-out after this many milliseconds of user inactivity (15 minutes). */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  mustChangePassword?: boolean;
}

export interface Principal {
  userId: string;
  tenantId: string;
  isPlatform: boolean;
  roles: string[];
  permissions: string[];
}

export const tokenStore = {
  get access(): string | null {
    return typeof window === 'undefined' ? null : sessionStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return typeof window === 'undefined' ? null : sessionStorage.getItem(REFRESH_KEY);
  },
  set(pair: { accessToken: string; refreshToken: string }): void {
    sessionStorage.setItem(ACCESS_KEY, pair.accessToken);
    sessionStorage.setItem(REFRESH_KEY, pair.refreshToken);
  },
  clear(): void {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[]; detail?: string };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    return message ?? body.detail ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function login(input: {
  identifier: string;
  password: string;
  tenantSlug?: string;
}): Promise<TokenPair> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const pair = (await res.json()) as TokenPair;
  tokenStore.set(pair);
  return pair;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.refresh;
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  tokenStore.clear();
}

/** Authenticated fetch with a one-shot refresh-on-401 retry. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let res = await fetch(`${API_URL}${path}`, withAuth(tokenStore.access));
  if (res.status === 401 && tokenStore.refresh) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenStore.refresh }),
    });
    if (refreshed.ok) {
      const pair = (await refreshed.json()) as TokenPair;
      tokenStore.set(pair);
      res = await fetch(`${API_URL}${path}`, withAuth(pair.accessToken));
    } else {
      tokenStore.clear();
    }
  }
  return res;
}

export async function getMe(): Promise<Principal> {
  const res = await authFetch('/auth/me');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Principal;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await authFetch('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
