/**
 * Baseline demo accounts. These are intentionally shareable credentials handed to
 * prospective school owners — NOT secrets. The runtime store hashes them on load.
 *
 * Admin can create more at runtime; those live only in server memory and disappear
 * on restart (an accepted reset trigger). There is no database.
 */

export interface SeedAccount {
  organizationName: string;
  username: string;
  password: string; // plaintext seed — hashed on ingest
  /** Days from server boot until expiry; null = never expires. */
  expiresInDays: number | null;
  status: 'ACTIVE' | 'DISABLED';
  admin?: boolean;
}

export const SEED_ACCOUNTS: SeedAccount[] = [
  // The demo administrator who manages all other demo accounts.
  {
    organizationName: 'Munaxa Demo Admin',
    username: 'munaxa-admin',
    password: 'MunaxaAdmin#2026',
    expiresInDays: null,
    status: 'ACTIVE',
    admin: true,
  },
  // A general-purpose demo login for prospects / sales.
  {
    organizationName: 'Munaxa Academy (Demo)',
    username: 'demo',
    password: 'MunaxaDemo#2026',
    expiresInDays: null,
    status: 'ACTIVE',
  },
  // Example time-boxed prospect account (mirrors the spec's "Future Academy / 7 days").
  {
    organizationName: 'Future Academy',
    username: 'futureacademy-demo',
    password: 'X9P4M2K8',
    expiresInDays: 7,
    status: 'ACTIVE',
  },
];
