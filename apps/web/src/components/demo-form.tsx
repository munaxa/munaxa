'use client';

import { useState, type FormEvent } from 'react';
import {
  Button,
  Field,
  Input,
  PRODUCT_ORDER,
  Textarea,
  cn,
  type BrandedProductId,
} from '@munaxa/ui';
import { ProductDot } from './product-scope';
import type { DemoProduct, DemoRequest } from '@/lib/demo-request';

interface FieldCopy {
  label: string;
  placeholder: string;
}

const productName: Record<BrandedProductId, DemoProduct> = {
  school: 'School',
  work: 'Work',
  docs: 'Docs',
};

const control = 'h-11 text-base';

/**
 * The demo / waitlist form. On a product page the product is fixed; on the hub the visitor picks
 * one. Submissions go to `/api/demo`, which emails them to info@munaxa.com.
 */
export function DemoForm(props: {
  /** Fixed product (product pages). Omit to show the School / Work / Docs picker (hub). */
  product?: BrandedProductId;
  kind?: DemoRequest['kind'];
  page: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  organization: FieldCopy;
  /** Optional second field shown beside Organization. */
  detail?: FieldCopy;
  submitLabel: string;
  /** Classes for the submit button's fill (the product's solid tone). */
  submitClassName: string;
  note: string;
  sentTitle: string;
  /** Confirmation text; "{product}" is replaced with the chosen product, e.g. "School". */
  sentBody: string;
}) {
  const [picked, setPicked] = useState<BrandedProductId>(props.product ?? 'school');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const field = (k: string): string => {
      const v = data.get(k);
      return typeof v === 'string' ? v : '';
    };
    setStatus('sending');
    setError(null);
    const body = {
      product: productName[picked],
      kind: props.kind ?? 'demo',
      name: field('name'),
      email: field('email'),
      phone: field('phone'),
      organization: field('organization'),
      detailLabel: props.detail?.label,
      detail: props.detail ? field('detail') : undefined,
      message: field('message'),
      website: field('website'),
      page: props.page,
    };
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? 'Something went wrong. Please try again.');
      }
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="flex flex-col items-start gap-3.5 py-6">
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-full',
            props.submitClassName,
          )}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
        <div className="font-display text-2xl font-semibold tracking-tight">{props.sentTitle}</div>
        <p className="text-base leading-relaxed text-neutral-600">
          {props.sentBody.replace('{product}', productName[picked])}
        </p>
      </div>
    );
  }

  const organization = (
    <Field label={props.organization.label} required>
      <Input
        name="organization"
        autoComplete="organization"
        placeholder={props.organization.placeholder}
        className={control}
      />
    </Field>
  );

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      {!props.product && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Which product?
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={picked === id}
                onClick={() => setPicked(id)}
                className={cn(
                  'font-display flex items-center justify-center gap-2 rounded-lg border-2 px-2 py-3 text-sm font-semibold',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  picked === id
                    ? 'border-primary-800 bg-primary-50'
                    : 'border-border bg-background',
                )}
              >
                <ProductDot product={id} />
                {productName[id]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <Field label="Full name" required>
        <Input
          name="name"
          autoComplete="name"
          placeholder={props.namePlaceholder}
          className={control}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Work email" required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder={props.emailPlaceholder}
            className={control}
          />
        </Field>
        <Field label="Phone" required>
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+962 79 123 4567"
            className={control}
          />
        </Field>
      </div>
      {props.detail ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {organization}
          <Field label={props.detail.label}>
            <Input name="detail" placeholder={props.detail.placeholder} className={control} />
          </Field>
        </div>
      ) : (
        organization
      )}
      <Field label="Message" optionalLabel="Optional">
        <Textarea
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Tell us what you run today and what you'd like to see."
          className="text-base"
        />
      </Field>
      {/* Hidden from people; anything that fills it in is dropped by the API. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive-strong"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={status === 'sending'}
        className={cn('mt-1 h-13 rounded-lg text-base font-semibold', props.submitClassName)}
      >
        {status === 'sending' ? 'Sending…' : props.submitLabel}
      </Button>
      <p className="text-center text-sm text-muted-foreground">{props.note}</p>
    </form>
  );
}
