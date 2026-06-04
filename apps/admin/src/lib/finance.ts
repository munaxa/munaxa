'use client';

import { authFetch } from './auth';

export interface Transaction {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference?: string | null;
}

export interface Statement {
  studentId: string;
  totals: { charged: string; paid: string; outstanding: string };
  charges: Array<{ id: string; description: string; amount: string; status: string }>;
  transactions: Transaction[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const financeApi = {
  createCharge: (data: { studentId: string; description: string; amount: number }) =>
    authFetch('/finance/charges', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json(r),
    ),
  statement: (studentId: string) =>
    authFetch(`/finance/students/${studentId}/statement`).then((r) => json<Statement>(r)),
  verify: (id: string) =>
    authFetch(`/finance/transactions/${id}/verify`, { method: 'POST' }).then((r) => json(r)),
  reject: (id: string) =>
    authFetch(`/finance/transactions/${id}/reject`, { method: 'POST', body: '{}' }).then((r) =>
      json(r),
    ),
};
