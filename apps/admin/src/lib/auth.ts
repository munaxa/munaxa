'use client';

/**
 * Minimal browser auth client for the Admin Portal (Phase 3).
 * Tokens are kept in localStorage for now; production hardening (httpOnly cookies +
 * silent refresh) is scheduled for Phase 15.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_KEY = 'munaxa.accessToken';
const REFRESH_KEY = 'munaxa.refreshToken';

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
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(pair: { accessToken: string; refreshToken: string }): void {
    localStorage.setItem(ACCESS_KEY, pair.accessToken);
    localStorage.setItem(REFRESH_KEY, pair.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
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
  email: string;
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
