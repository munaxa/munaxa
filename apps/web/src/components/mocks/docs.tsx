import { cn } from '@munaxa/ui';
import { MockPanel } from '../product-sections';
import { CardHead, Code, Dot, Pill, Ring, ShieldCheck, SmallButton, TwoLine, rowRule } from './ui';

/* Munaxa Docs feature mock-ups. Rendered on the Docs page, inside the Docs theme. */

const solid = 'bg-primary-700 text-background';

/* 01 · Lifecycle and revisions */

const stages = [
  { label: 'Draft', state: 'done' },
  { label: 'Review', state: 'done' },
  { label: 'Approved', state: 'done' },
  { label: 'Published', state: 'current' },
  { label: 'Super­seded', state: 'todo' },
  { label: 'Retired', state: 'todo' },
] as const;

export function LifecycleMock() {
  return (
    <MockPanel product="docs" className="flex flex-col gap-4.5">
      <CardHead
        title={
          <>
            Quality Manual <Code>QM-0001</Code>
          </>
        }
      >
        <Pill>Rev B in force</Pill>
      </CardHead>
      <ol className="relative grid grid-cols-6 gap-x-1">
        <span className="absolute inset-x-1/12 top-3 h-0.5 bg-border" />
        <span className="absolute start-1/12 top-3 h-0.5 w-1/2 bg-primary-700" />
        {stages.map((s) => (
          <li key={s.label} className="relative flex flex-col items-center gap-2">
            {s.state === 'done' && <Dot className={solid}>✓</Dot>}
            {s.state === 'current' && (
              <Dot className="border-2 border-primary-700 bg-background">
                <span className="size-2.5 rounded-full bg-primary-700" />
              </Dot>
            )}
            {s.state === 'todo' && <Ring className="bg-background" />}
            <span
              className={cn(
                'text-center text-xs leading-tight wrap-anywhere',
                s.state === 'todo' && 'text-neutral-400',
                s.state === 'current' && 'font-semibold text-primary-900',
                s.state === 'done' && 'text-neutral-600',
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-neutral-50 px-3.5 py-3">
        <span className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-strong">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Rev C is checked out</span>
          <span className="block text-xs text-neutral-600">
            Locked by the Quality Manager. Readers still see Rev B.
          </span>
        </span>
        <Pill tone="warning">In review</Pill>
      </div>
    </MockPanel>
  );
}

/* 02 · Approval workflows */

export function WorkflowMock() {
  return (
    <MockPanel product="docs">
      <CardHead title="Supplier Audit SOP · approval" className="mb-2">
        <Pill tone="warning">Step 2 of 3</Pill>
      </CardHead>
      <div className={cn('flex gap-3.5 py-3', rowRule)}>
        <Dot className={solid}>✓</Dot>
        <TwoLine title="Procurement review · F. Odeh" sub="Approved Oct 8, 14:31 · 1 comment" />
      </div>
      <div className={cn('flex gap-3.5 py-3', rowRule)}>
        <Dot className="bg-primary-400 font-bold text-background">2</Dot>
        <TwoLine
          title="Quality approval · you"
          sub="Waiting 2 days · escalates to QA Director on Oct 13"
        />
        <span className="flex gap-1.5 self-center">
          <SmallButton solid={solid}>Approve</SmallButton>
          <SmallButton>Return</SmallButton>
        </span>
      </div>
      <div className="flex gap-3.5 py-3">
        <Ring />
        <TwoLine
          quiet
          title="Final sign-off · Operations Director"
          sub="Delegated to deputy while on leave"
        />
      </div>
    </MockPanel>
  );
}

/* 03 · Search */

function FileBadge({ kind }: { kind: string }) {
  return (
    <span className="flex size-8.5 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-900">
      {kind}
    </span>
  );
}

const hit = 'rounded-xs bg-primary-400/35 px-0.5';

export function SearchMock() {
  const chip = 'rounded-full border border-border px-3 py-1 text-neutral-600';
  return (
    <MockPanel product="docs" className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5 rounded-lg border-2 border-primary-700 px-3.5 py-2.5 ring-4 ring-primary-500/15">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-4 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="text-sm">calibration certificate</span>
        <span className="-ms-1.5 h-4 w-0.5 bg-primary-700" />
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-primary-900 px-3 py-1 font-semibold text-background">
          All types
        </span>
        <span className={chip}>SOPs</span>
        <span className={chip}>Records</span>
        <span className={chip}>Published only</span>
      </div>
      <div className="flex flex-col">
        <div className={cn('flex items-center gap-3 py-3', rowRule)}>
          <FileBadge kind="PDF" />
          <TwoLine
            title={
              <>
                Balance <span className={hit}>calibration certificate</span>, Lab 2
              </>
            }
            sub="REC-0311 · matched on scanned page 2"
          />
          <Pill>Published</Pill>
        </div>
        <div className="flex items-center gap-3 py-3">
          <FileBadge kind="DOC" />
          <TwoLine
            title={
              <>
                Equipment <span className={hit}>calibration</span> SOP
              </>
            }
            sub="SOP-0027 · Rev D · matched in section 4.2"
          />
          <Pill>Published</Pill>
        </div>
      </div>
    </MockPanel>
  );
}

/* 04 · Signatures and audit */

const trail = [
  {
    at: 'Oct 9 · 09:14',
    title: 'Signature witnessed · R. Salameh',
    sub: 'Meaning: Approved · identity re-verified',
    hash: 'a3f2…9c',
  },
  {
    at: 'Oct 8 · 16:40',
    title: 'Revision submitted for approval',
    sub: 'Workflow WF-114 started',
    hash: '77be…41',
  },
  {
    at: 'Oct 6 · 11:02',
    title: 'Viewed by external auditor',
    sub: 'Read-only link · watermarked preview',
    hash: 'd1c8…0f',
  },
];

export function AuditMock() {
  return (
    <MockPanel product="docs">
      <CardHead
        className="mb-1.5"
        title={
          <>
            Audit trail <Code>TPL-0007</Code>
          </>
        }
      >
        <Pill>
          <ShieldCheck className="me-1.5 size-3" />
          Chain verified
        </Pill>
      </CardHead>
      {trail.map((t, i) => (
        <div
          key={t.hash}
          className={cn('flex items-start gap-3 py-3', i < trail.length - 1 && rowRule)}
        >
          <span className="w-20 shrink-0 pt-0.5 font-mono text-xs text-neutral-400">{t.at}</span>
          <TwoLine title={t.title} sub={t.sub} />
          <span className="pt-0.5 font-mono text-xs text-neutral-400">{t.hash}</span>
        </div>
      ))}
    </MockPanel>
  );
}
