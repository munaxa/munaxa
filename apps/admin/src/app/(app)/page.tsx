'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell, usePrincipal } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { dashboardApi, type DashboardOverview } from '@/lib/dashboard';
import { studentsApi, type Student } from '@/lib/people';
import { sectionsApi, type Section } from '@/lib/structure';
import { StudentProfileDialog } from './people/students/student-profile-dialog';
import { NavIcon, type NavIconKey } from '@/components/nav-icons';
import type { Locale } from '@/lib/i18n';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  cn,
} from '@/components/ui';

type Translate = (k: string) => string;

export default function Home() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}

/** Accent tone — all sourced from existing DS tokens. */
type Tone = 'primary' | 'aqua' | 'coral' | 'danger';

const chipTone: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  aqua: 'bg-aqua/10 text-aqua',
  coral: 'bg-coral/10 text-coral',
  danger: 'bg-destructive/10 text-destructive',
};
const dotTone: Record<Tone, string> = {
  primary: 'bg-primary',
  aqua: 'bg-aqua',
  coral: 'bg-coral',
  danger: 'bg-destructive',
};
const strokeTone: Record<Tone, string> = {
  primary: 'stroke-primary',
  aqua: 'stroke-aqua',
  coral: 'stroke-coral',
  danger: 'stroke-destructive',
};
const GRADE_TONES: Tone[] = ['primary', 'aqua', 'coral', 'danger'];

const STATUS_TONE: Record<string, 'success' | 'muted' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  GRADUATED: 'warning',
  WITHDRAWN: 'danger',
  PENDING: 'warning',
};

const QUICK_ACTIONS: Array<{
  href: string;
  labelKey: string;
  icon: NavIconKey;
  tone: Tone;
  perm?: string;
}> = [
  {
    href: '/people/students',
    labelKey: 'dashboard.action.addStudent',
    icon: 'students',
    tone: 'primary',
    perm: 'student:manage',
  },
  {
    href: '/admissions',
    labelKey: 'dashboard.action.newAdmission',
    icon: 'enrollment',
    tone: 'aqua',
    perm: 'enrollment:manage',
  },
  {
    href: '/attendance',
    labelKey: 'dashboard.action.markAttendance',
    icon: 'attendance',
    tone: 'primary',
    perm: 'attendance:read',
  },
  {
    href: '/finance',
    labelKey: 'dashboard.action.createInvoice',
    icon: 'finance',
    tone: 'coral',
    perm: 'finance:read',
  },
  {
    href: '/communication',
    labelKey: 'dashboard.action.sendMessage',
    icon: 'communication',
    tone: 'primary',
    perm: 'announcement:manage',
  },
  {
    href: '/reports',
    labelKey: 'dashboard.action.generateReport',
    icon: 'reports',
    tone: 'primary',
    perm: 'report:read',
  },
];

const PAGE_SIZE = 10;

function Dashboard() {
  const principal = usePrincipal();
  const { t, locale } = useI18n();
  const held = useMemo(() => new Set(principal.permissions), [principal.permissions]);
  const can = (perm?: string) => !perm || held.has(perm) || held.has('*') || principal.isPlatform;
  const actions = QUICK_ACTIONS.filter((a) => can(a.perm));
  const canSeeKpis = can('report:read');
  const canSeeStudents = can('student:manage');

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState(false);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // Directory state
  const [search, setSearch] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [fSection, setFSection] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fGender, setFGender] = useState('');
  const [page, setPage] = useState(1);

  // Selected student → profile preview / full dialog
  const [selected, setSelected] = useState<Student | null>(null);
  const [profileOpen, setProfileOpen] = useState<Student | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setError(false);
      setData(await dashboardApi.overview());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (canSeeKpis) void loadOverview();
  }, [canSeeKpis, loadOverview]);

  useEffect(() => {
    if (!canSeeStudents) return;
    studentsApi
      .list()
      .then((rows) => {
        setStudents(rows);
        setSelected((cur) => cur ?? rows[0] ?? null);
      })
      .catch(() => setStudents([]));
    sectionsApi
      .list()
      .then(setSections)
      .catch(() => undefined);
  }, [canSeeStudents]);

  const gradeName = useCallback(
    (id?: string | null) => sections.find((s) => s.id === id)?.grade?.nameEn ?? '—',
    [sections],
  );
  const sectionName = useCallback(
    (id?: string | null) => sections.find((s) => s.id === id)?.name ?? '—',
    [sections],
  );
  const sectionLabel = useCallback(
    (id?: string | null) => {
      const sec = sections.find((s) => s.id === id);
      if (!sec) return undefined;
      return sec.grade ? `${sec.grade.nameEn} · ${sec.name}` : sec.name;
    },
    [sections],
  );

  const grades = useMemo(
    () =>
      [
        ...new Map(
          sections
            .filter((s) => s.grade)
            .map((s) => [
              s.grade!.id,
              { id: s.grade!.id, name: s.grade!.nameEn, level: s.grade!.level },
            ]),
        ).values(),
      ].sort((a, b) => a.level - b.level),
    [sections],
  );
  const sectionsForGrade = useMemo(
    () => (fGrade ? sections.filter((s) => s.grade?.id === fGrade) : sections),
    [sections, fGrade],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students ?? []).filter(
      (s) =>
        (!q ||
          `${s.firstNameEn} ${s.lastNameEn}`.toLowerCase().includes(q) ||
          (s.moeStudentNumber ?? '').toLowerCase().includes(q) ||
          (s.nationalId ?? '').toLowerCase().includes(q)) &&
        (!fGrade || sections.find((x) => x.id === s.sectionId)?.grade?.id === fGrade) &&
        (!fSection || s.sectionId === fSection) &&
        (!fStatus || s.status === fStatus) &&
        (!fGender || s.gender === fGender),
    );
  }, [students, sections, search, fGrade, fSection, fStatus, fGender]);

  // Keep the page within bounds when filters shrink the list.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => setPage(1), [search, fGrade, fSection, fStatus, fGender]);

  const activeCount = students ? students.filter((s) => s.status === 'ACTIVE').length : null;
  const att = data?.attendanceToday;
  const rate =
    att && att.total > 0 ? Math.round(((att.present + att.late) / att.total) * 100) : null;
  const markedRates = (data?.attendanceTrend ?? [])
    .map((d) => d.rate)
    .filter((r): r is number => r !== null);
  const [prevRate, lastRate] = markedRates.slice(-2);
  const attendanceDelta =
    prevRate !== undefined && lastRate !== undefined ? lastRate - prevRate : null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* KPI row */}
      {canSeeKpis ? (
        error && !data ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                title={t('dashboard.overviewUnavailable')}
                action={
                  <Button variant="outline" size="sm" onClick={() => void loadOverview()}>
                    {t('common.retry')}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : data ? (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi
              icon="students"
              label={t('dashboard.totalStudents')}
              value={formatNumber(data.students, locale)}
              delta={{ value: data.deltas.studentsThisMonth, suffix: t('dashboard.fromLastMonth') }}
              spark={data.sparklines.students}
            />
            <Kpi
              icon="students"
              tone="aqua"
              label={t('dashboard.activeStudents')}
              value={activeCount !== null ? formatNumber(activeCount, locale) : '—'}
              sparkTone="aqua"
            />
            <Kpi
              icon="enrollment"
              tone="coral"
              label={t('dashboard.newAdmissions')}
              value={formatNumber(data.deltas.studentsThisMonth, locale)}
            />
            <Kpi
              icon="finance"
              tone="aqua"
              label={t('dashboard.collectedFees')}
              value={formatMoneyCompact(data.finance.collectedThisMonth, locale)}
            />
            <Kpi
              icon="attendance"
              label={t('dashboard.attendanceToday')}
              value={rate !== null ? `${rate}%` : '—'}
              delta={
                attendanceDelta !== null
                  ? { value: attendanceDelta, suffix: t('dashboard.vsYesterday'), unit: '%' }
                  : undefined
              }
              spark={markedRates}
            />
          </section>
        ) : (
          <KpiSkeleton />
        )
      ) : null}

      {/* Main: directory + right rail */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StudentDirectoryCard
            t={t}
            locale={locale}
            canSeeStudents={canSeeStudents}
            students={students}
            rows={pageRows}
            total={filtered.length}
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
            search={search}
            onSearch={setSearch}
            grades={grades}
            sectionsForGrade={sectionsForGrade}
            fGrade={fGrade}
            fSection={fSection}
            fStatus={fStatus}
            fGender={fGender}
            setFGrade={setFGrade}
            setFSection={setFSection}
            setFStatus={setFStatus}
            setFGender={setFGender}
            gradeName={gradeName}
            sectionName={sectionName}
            selectedId={selected?.id}
            onSelect={setSelected}
            onOpenProfile={setProfileOpen}
            canRegister={can('enrollment:manage')}
          />
        </div>
        <div className="space-y-6">
          <ProfilePreviewCard
            t={t}
            student={selected}
            gradeSection={sectionLabel(selected?.sectionId)}
            onOpenProfile={() => selected && setProfileOpen(selected)}
          />
          <ActivityTimelineCard t={t} locale={locale} activity={data?.recentActivity ?? []} />
        </div>
      </section>

      {/* Bottom: fee overview · grade donut · quick actions */}
      <section className="grid gap-6 lg:grid-cols-3">
        <FeeCollectionCard t={t} locale={locale} finance={data?.finance} />
        <StudentsByGradeCard t={t} locale={locale} data={data?.studentsByGrade ?? []} />
        <QuickActionsCard t={t} actions={actions} />
      </section>

      {profileOpen ? (
        <StudentProfileDialog
          student={profileOpen}
          sectionLabel={sectionLabel(profileOpen.sectionId)}
          onClose={() => setProfileOpen(null)}
          onEdit={() => setProfileOpen(null)}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------
function Kpi({
  icon,
  label,
  value,
  tone = 'primary',
  delta,
  spark,
  sparkTone = 'primary',
}: {
  icon: NavIconKey;
  label: string;
  value: string;
  tone?: Tone;
  delta?: { value: number; suffix: string; unit?: string | undefined } | undefined;
  spark?: number[] | undefined;
  sparkTone?: Tone;
}) {
  return (
    <Card className="h-full w-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span
            aria-hidden="true"
            className={cn('flex h-10 w-10 items-center justify-center rounded-xl', chipTone[tone])}
          >
            <NavIcon name={icon} />
          </span>
          {spark && spark.length >= 2 ? <Sparkline values={spark} tone={sparkTone} /> : null}
        </div>
        <div>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        {delta ? (
          <DeltaChip value={delta.value} suffix={delta.suffix} unit={delta.unit} />
        ) : (
          <span className="h-4" />
        )}
      </CardContent>
    </Card>
  );
}

function DeltaChip({
  value,
  suffix,
  unit,
}: {
  value: number;
  suffix: string;
  unit?: string | undefined;
}) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        up ? 'text-aqua' : 'text-coral',
      )}
    >
      <span aria-hidden="true">{up ? '↑' : '↓'}</span>
      {Math.abs(value)}
      {unit ?? ''}
      <span className="font-normal text-muted-foreground">{suffix}</span>
    </span>
  );
}

function Sparkline({ values, tone = 'primary' }: { values: number[]; tone?: Tone }) {
  const w = 72;
  const h = 28;
  const pad = 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <polyline
        points={points}
        className={strokeTone[tone]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[124px] animate-pulse rounded-xl bg-secondary/60" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 p-6 pb-3">
      <h3 className="font-display text-lg font-semibold leading-none">{title}</h3>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student directory (table + filters + pagination)
// ---------------------------------------------------------------------------
function StudentDirectoryCard({
  t,
  locale,
  canSeeStudents,
  students,
  rows,
  total,
  page,
  pageCount,
  onPage,
  search,
  onSearch,
  grades,
  sectionsForGrade,
  fGrade,
  fSection,
  fStatus,
  fGender,
  setFGrade,
  setFSection,
  setFStatus,
  setFGender,
  gradeName,
  sectionName,
  selectedId,
  onSelect,
  onOpenProfile,
  canRegister,
}: {
  t: Translate;
  locale: Locale;
  canSeeStudents: boolean;
  students: Student[] | null;
  rows: Student[];
  total: number;
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
  search: string;
  onSearch: (v: string) => void;
  grades: Array<{ id: string; name: string; level: number }>;
  sectionsForGrade: Section[];
  fGrade: string;
  fSection: string;
  fStatus: string;
  fGender: string;
  setFGrade: (v: string) => void;
  setFSection: (v: string) => void;
  setFStatus: (v: string) => void;
  setFGender: (v: string) => void;
  gradeName: (id?: string | null) => string;
  sectionName: (id?: string | null) => string;
  selectedId?: string | undefined;
  onSelect: (s: Student) => void;
  onOpenProfile: (s: Student) => void;
  canRegister: boolean;
}) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <Card className="flex h-full flex-col">
      <SectionHeader
        title={t('nav.people')}
        action={
          canRegister ? (
            <Link href="/admissions">
              <Button size="sm">
                <span aria-hidden="true">+</span>
                {t('people.newRegistration')}
              </Button>
            </Link>
          ) : null
        }
      />
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('common.search')} className="lg:col-span-2">
            <Input
              value={search}
              placeholder={t('dashboard.searchStudents')}
              onChange={(e) => onSearch(e.target.value)}
            />
          </Field>
          <Field label={t('structure.grade')}>
            <Select
              value={fGrade}
              onChange={(e) => {
                setFGrade(e.target.value);
                setFSection('');
              }}
            >
              <option value="">{t('people.allGrades')}</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('structure.section')}>
            <Select value={fSection} onChange={(e) => setFSection(e.target.value)}>
              <option value="">{t('people.allSections')}</option>
              {sectionsForGrade.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.grade ? `${s.grade.nameEn} · ${s.name}` : s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.status')}>
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">{t('people.allStatuses')}</option>
              {['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('people.gender')}>
            <Select value={fGender} onChange={(e) => setFGender(e.target.value)}>
              <option value="">{t('people.allGenders')}</option>
              <option value="MALE">{t('people.male')}</option>
              <option value="FEMALE">{t('people.female')}</option>
            </Select>
          </Field>
        </div>

        {!canSeeStudents ? (
          <EmptyState title={t('people.noStudents')} />
        ) : students === null ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-secondary/60" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{t('people.studentNo')}</TH>
                    <TH>{t('common.name')}</TH>
                    <TH>{t('structure.grade')}</TH>
                    <TH>{t('structure.section')}</TH>
                    <TH>{t('common.status')}</TH>
                    <TH className="text-end">{t('common.actions')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((s) => (
                    <TR
                      key={s.id}
                      className={cn('cursor-pointer', selectedId === s.id ? 'bg-primary/5' : '')}
                    >
                      <TD className="font-mono text-xs text-muted-foreground">
                        {s.moeStudentNumber || '—'}
                      </TD>
                      <TD>
                        <button
                          type="button"
                          className="flex items-center gap-3 text-start"
                          onClick={() => onSelect(s)}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                          >
                            {(s.firstNameEn.trim()[0] ?? '?').toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {s.firstNameEn} {s.lastNameEn}
                            </span>
                            <span
                              className="block truncate text-xs text-muted-foreground"
                              dir="rtl"
                            >
                              {s.firstNameAr} {s.lastNameAr}
                            </span>
                          </span>
                        </button>
                      </TD>
                      <TD>{gradeName(s.sectionId)}</TD>
                      <TD>{sectionName(s.sectionId)}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[s.status] ?? 'muted'}>{s.status}</Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton label={t('people.view')} onClick={() => onSelect(s)}>
                            <EyeIcon />
                          </IconButton>
                          <IconButton
                            label={t('dashboard.viewFullProfile')}
                            onClick={() => onOpenProfile(s)}
                          >
                            <ExpandIcon />
                          </IconButton>
                        </div>
                      </TD>
                    </TR>
                  ))}
                  {rows.length === 0 ? (
                    <TR>
                      <TD colSpan={6}>
                        <EmptyState title={t('people.noStudentsMatch')} />
                      </TD>
                    </TR>
                  ) : null}
                </TBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
              <span className="text-muted-foreground">
                {t('dashboard.showingRange')
                  .replace('{from}', formatNumber(from, locale))
                  .replace('{to}', formatNumber(to, locale))
                  .replace('{total}', formatNumber(total, locale))}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPage(page - 1)}
                  disabled={page <= 1}
                  aria-label={t('common.previous')}
                >
                  ‹
                </Button>
                <span className="px-2 font-mono text-xs tabular-nums">
                  {page} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPage(page + 1)}
                  disabled={page >= pageCount}
                  aria-label={t('common.next')}
                >
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Profile preview
// ---------------------------------------------------------------------------
function ProfilePreviewCard({
  t,
  student,
  gradeSection,
  onOpenProfile,
}: {
  t: Translate;
  student: Student | null;
  gradeSection?: string | undefined;
  onOpenProfile: () => void;
}) {
  return (
    <Card>
      <SectionHeader title={t('dashboard.studentProfilePreview')} />
      <CardContent>
        {!student ? (
          <EmptyState
            icon={<NavIcon name="students" className="h-6 w-6" />}
            title={t('dashboard.selectStudentPreview')}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary"
              >
                {(student.firstNameEn.trim()[0] ?? '?').toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display font-semibold">
                    {student.firstNameEn} {student.lastNameEn}
                  </p>
                  <Badge tone={STATUS_TONE[student.status] ?? 'muted'}>{student.status}</Badge>
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {student.moeStudentNumber || '—'}
                  {gradeSection ? ` · ${gradeSection}` : ''}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
              <Detail label={t('dashboard.admissionDate')}>
                {student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : '—'}
              </Detail>
              <Detail label={t('people.nationalId')}>{student.nationalId || '—'}</Detail>
              <Detail label={t('structure.grade')}>{gradeSection ?? '—'}</Detail>
              <Detail label={t('people.gender')}>
                {student.gender ? t(`people.${student.gender.toLowerCase()}`) : '—'}
              </Detail>
            </dl>

            <Button variant="outline" className="w-full" onClick={onOpenProfile}>
              {t('dashboard.viewFullProfile')}
              <span aria-hidden="true">→</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity timeline
// ---------------------------------------------------------------------------
function ActivityTimelineCard({
  t,
  locale,
  activity,
}: {
  t: Translate;
  locale: Locale;
  activity: DashboardOverview['recentActivity'];
}) {
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );
  const items = activity.slice(0, 5);
  return (
    <Card>
      <SectionHeader
        title={t('dashboard.activityTimeline')}
        action={
          <Link href="/reports" className="text-xs font-medium text-primary hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        }
      />
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<NavIcon name="reports" className="h-6 w-6" />}
            title={t('dashboard.noRecentActivity')}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((a, i) => {
              const who = a.actorName ?? a.actorUsername ?? t('dashboard.systemActor');
              return (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{a.action}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {who} · {fmt.format(new Date(a.at))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fee collection overview (real figures; monthly trend needs history)
// ---------------------------------------------------------------------------
function FeeCollectionCard({
  t,
  locale,
  finance,
}: {
  t: Translate;
  locale: Locale;
  finance?: DashboardOverview['finance'] | undefined;
}) {
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.feeCollectionOverview')} />
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('dashboard.totalCollected')}</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums text-aqua">
              {finance ? formatMoney(finance.collectedThisMonth, locale) : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{t('dashboard.pending')}</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums text-coral">
              {finance ? formatMoney(finance.outstanding, locale) : '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8">
          <p className="text-xs text-muted-foreground">{t('dashboard.monthlyTrendUnavailable')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Students by grade donut
// ---------------------------------------------------------------------------
function StudentsByGradeCard({
  t,
  locale,
  data,
}: {
  t: Translate;
  locale: Locale;
  data: DashboardOverview['studentsByGrade'];
}) {
  const total = data.reduce((s, d) => s + d.students, 0);
  const gradeLabel = (level: number) => (level === 0 ? 'KG' : formatNumber(level, locale));
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.studentsByGrade')} />
      <CardContent className="flex flex-1 flex-col">
        {total > 0 ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart
              segments={data.map((d, i) => ({
                value: (d.students / total) * 100,
                tone: GRADE_TONES[i % GRADE_TONES.length]!,
              }))}
              center={
                <div>
                  <p className="font-display text-2xl font-semibold tabular-nums">
                    {formatNumber(total, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.students')}</p>
                </div>
              }
            />
            <ul className="flex-1 space-y-2">
              {data.map((d, i) => (
                <li key={d.level} className="flex items-center gap-2.5 text-sm">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full',
                      dotTone[GRADE_TONES[i % GRADE_TONES.length]!],
                    )}
                  />
                  <span className="flex-1 text-muted-foreground">{gradeLabel(d.level)}</span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(d.students, locale)}
                  </span>
                  <span className="w-10 text-end font-mono text-xs text-muted-foreground tabular-nums">
                    {total > 0 ? `${Math.round((d.students / total) * 100)}%` : '0%'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            className="flex-1 justify-center"
            icon={<NavIcon name="academics" className="h-6 w-6" />}
            title={t('dashboard.noGradeData')}
          />
        )}
      </CardContent>
    </Card>
  );
}

function DonutChart({
  segments,
  size = 160,
  thickness = 16,
  center,
}: {
  segments: Array<{ value: number; tone: Tone }>;
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={thickness}
          className="stroke-secondary"
          pathLength={100}
        />
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => {
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={thickness}
                className={strokeTone[s.tone]}
                pathLength={100}
                strokeDasharray={`${s.value} ${100 - s.value}`}
                strokeDashoffset={-acc}
              />
            );
            acc += s.value;
            return el;
          })}
      </svg>
      {center ? (
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------
function QuickActionsCard({ t, actions }: { t: Translate; actions: typeof QUICK_ACTIONS }) {
  if (actions.length === 0) return null;
  return (
    <Card className="flex flex-col">
      <SectionHeader title={t('dashboard.quickActions')} />
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href as never}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  chipTone[a.tone],
                )}
              >
                <NavIcon name={a.icon} />
              </span>
              <span className="text-xs font-medium leading-tight">{t(a.labelKey)}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-US').format(n);
}

function formatMoney(value: string, locale: Locale): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-JO', {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n);
}

function formatMoneyCompact(value: string, locale: Locale): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-JO', {
    style: 'currency',
    currency: 'JOD',
    maximumFractionDigits: 0,
  }).format(n);
}
