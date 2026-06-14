'use client';

/**
 * Client session context: the active persona (role being explored), the demo
 * organization name from the signed cookie, plus locale (EN/AR → LTR/RTL) and theme.
 * Persona + UI prefs live in sessionStorage, so closing the browser clears them — and
 * with the session cookie also gone, the next visit starts fresh.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  PERSONA_BY_ID,
  personaPermissions,
  type Persona,
  type PersonaId,
} from '@/lib/rbac';
import {
  DEFAULT_LOCALE,
  directionForLocale,
  getMessages,
  resolveMessage,
  type Locale,
} from '@/lib/i18n';
import { useDemo } from '@/lib/demo-store/context';

const PERSONA_KEY = 'munaxa.demo.persona';
const LOCALE_KEY = 'munaxa.demo.locale';
const THEME_KEY = 'munaxa.demo.theme';
type Theme = 'light' | 'dark';

interface SessionValue {
  org: string;
  isAdmin: boolean;
  persona: Persona;
  permissions: string[];
  setPersona: (id: PersonaId) => void;
  can: (perm?: string) => boolean;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (path: string) => string;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}

export function SessionProvider({
  org,
  isAdmin,
  children,
}: {
  org: string;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { actions } = useDemo();
  const [personaId, setPersonaId] = useState<PersonaId>('owner');
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const p = sessionStorage.getItem(PERSONA_KEY) as PersonaId | null;
    if (p && PERSONA_BY_ID[p]) setPersonaId(p);
    const l = (sessionStorage.getItem(LOCALE_KEY) as Locale | null) ?? DEFAULT_LOCALE;
    setLocaleState(l);
    applyLocale(l);
    const th = (sessionStorage.getItem(THEME_KEY) as Theme | null) ?? 'dark';
    setTheme(th);
    document.documentElement.classList.toggle('dark', th === 'dark');
  }, []);

  const setPersona = useCallback((idValue: PersonaId) => {
    setPersonaId(idValue);
    sessionStorage.setItem(PERSONA_KEY, idValue);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    sessionStorage.setItem(LOCALE_KEY, l);
    applyLocale(l);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      sessionStorage.setItem(THEME_KEY, next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    // Reset session-only data and clear persona/prefs, then leave the app.
    actions.reset();
    sessionStorage.removeItem(PERSONA_KEY);
    router.replace('/login');
  }, [actions, router]);

  const value = useMemo<SessionValue>(() => {
    const persona = PERSONA_BY_ID[personaId];
    const permissions = personaPermissions(personaId);
    const messages = getMessages(locale);
    return {
      org,
      isAdmin,
      persona,
      permissions,
      setPersona,
      can: (perm?: string) => !perm || (permissions as string[]).includes(perm),
      locale,
      setLocale,
      theme,
      toggleTheme,
      t: (path: string) => resolveMessage(messages, path),
      logout,
    };
  }, [org, isAdmin, personaId, locale, theme, setPersona, setLocale, toggleTheme, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function applyLocale(locale: Locale) {
  const el = document.documentElement;
  el.lang = locale;
  el.dir = directionForLocale(locale);
}
