import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  resolveDay,
  resolveScheduleType,
  buildLiveContext,
  detectConflicts,
  canPublish,
  dayOfWeekOf,
  type ResolvedDay,
  type ResolvedClass,
  type LiveClassContext,
  type Conflict,
  type ScheduledClassInput,
  type ConflictClassInput,
} from './engine/scheduling-engine';
import {
  SchedulingRepository,
  type LoadedClass,
  type LoadedException,
  type LoadedTeacherClass,
} from './scheduling.repository';
import { TenantContextStore } from '../prisma/tenant-context';

/** A resolved class enriched with the section/grade labels the teacher card needs. */
export interface TeacherResolvedClass extends ResolvedClass {
  sectionId: string;
  sectionName: string;
  gradeNameEn: string;
  gradeNameAr: string;
}

export interface TeacherDay {
  date: string;
  live: LiveClassContext;
  classes: TeacherResolvedClass[];
}

/**
 * The single scheduling authority for the whole platform. Every surface — Student/Parent/Teacher
 * portals, Attendance, dashboards, admin, and future modules (exams, events, analytics, AI) — resolves
 * schedules and enforces publishing rules through this one service. There is no other scheduling logic.
 *
 * Canonical pipeline (never bypassed):
 *   Published Schedule Plan → Section Timetable → Scheduled Class → Schedule Exception → Location.
 */
@Injectable()
export class SchedulingService {
  constructor(private readonly repo: SchedulingRepository) {}

  private static toInput(c: LoadedClass): ScheduledClassInput {
    return {
      sectionId: c.sectionId,
      scheduleType: c.scheduleType,
      dayOfWeek: c.dayOfWeek,
      classNumber: c.classNumber,
      startTime: c.startTime,
      endTime: c.endTime,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      subjectColor: c.subjectColor,
      teacherId: c.teacherId,
      teacherName: c.teacherName,
      locationName: c.locationName,
    };
  }

  private static toException(e: LoadedException) {
    return {
      classNumber: e.classNumber,
      type: e.type,
      subjectName: e.subjectName,
      teacherId: e.teacherId,
      teacherName: e.teacherName,
      substituteTeacherId: e.substituteTeacherId,
      substituteTeacherName: e.substituteTeacherName,
      note: e.note,
    };
  }

  // ----- Section resolution --------------------------------------------------

  /** Resolve one section on one date (the core of every downstream read). */
  async getSectionDay(sectionId: string, date: Date): Promise<ResolvedDay> {
    const data = await this.repo.loadSectionDay(sectionId, date);
    if (!data) {
      return { scheduleType: 'REGULAR', dayOfWeek: dayOfWeekOf(date), isHoliday: false, classes: [] };
    }
    const scheduleType = resolveScheduleType(data.ramadan, date);
    return resolveDay({
      classes: data.classes.map(SchedulingService.toInput),
      exceptions: data.exceptions.map(SchedulingService.toException),
      scheduleType,
      dayOfWeek: dayOfWeekOf(date),
    });
  }

  /** Live "current class" context for a section (Attendance + dashboards). */
  async getCurrentSectionClass(sectionId: string, at: Date = new Date()): Promise<LiveClassContext> {
    const data = await this.repo.loadSectionDay(sectionId, at);
    const scheduleType = resolveScheduleType(data?.ramadan ?? null, at);
    const day = resolveDay({
      classes: (data?.classes ?? []).map(SchedulingService.toInput),
      exceptions: (data?.exceptions ?? []).map(SchedulingService.toException),
      scheduleType,
      dayOfWeek: dayOfWeekOf(at),
    });
    return buildLiveContext(day, minutesOf(at), data?.breaks ?? []);
  }

  /** The section's published weekly grid, grouped by weekday (admin/portal week view). */
  async getSectionSchedule(sectionId: string, date: Date = new Date()) {
    const classes = await this.repo.loadSectionWeek(sectionId, date);
    return groupByDay(classes);
  }

  // ----- Student inheritance -------------------------------------------------

  /** A student inherits their section's published schedule — no per-student records. */
  async getStudentSchedule(sectionId: string | null, date: Date = new Date()) {
    if (!sectionId) return groupByDay([]);
    return this.getSectionSchedule(sectionId, date);
  }

  async getStudentCurrentClass(sectionId: string | null, at: Date = new Date()) {
    if (!sectionId) return buildLiveContext({ scheduleType: 'REGULAR', dayOfWeek: dayOfWeekOf(at), isHoliday: false, classes: [] }, minutesOf(at));
    return this.getCurrentSectionClass(sectionId, at);
  }

  /** The acting user's linked student section (null if the caller is not a student). */
  async actingStudentSectionId(): Promise<string | null> {
    const userId = TenantContextStore.get()?.actorUserId;
    return userId ? this.repo.studentSectionForUser(userId) : null;
  }

  // ----- Teacher resolution --------------------------------------------------

  /** Resolve the acting user's Teacher profile, or throw 403. */
  async requireActingTeacherId(): Promise<string> {
    const userId = TenantContextStore.get()?.actorUserId;
    const teacherId = userId ? await this.repo.teacherIdForUser(userId) : null;
    if (!teacherId) throw new ForbiddenException('No teacher profile is linked to your account');
    return teacherId;
  }

  /** A teacher's resolved day across all their sections (exceptions applied per section). */
  async getTeacherDay(teacherId: string, at: Date = new Date()): Promise<TeacherDay> {
    const dow = dayOfWeekOf(at);
    const dayClasses = await this.repo.loadTeacherDayClasses(teacherId, dow);
    const sectionIds = [...new Set(dayClasses.map((c) => c.sectionId))];
    const campusIds = [...new Set(dayClasses.map((c) => c.campusId))];

    const exceptionsBySection = await this.repo.loadExceptionsForSections(sectionIds, at);
    const configs = await Promise.all(campusIds.map((id) => this.repo.ramadanConfig(id)));
    const scheduleTypeByCampus = new Map(
      campusIds.map((id, i) => [id, resolveScheduleType(configs[i] ?? null, at)]),
    );

    // Resolve each section independently (reusing the engine), then merge for the live card.
    const bySection = new Map<string, LoadedTeacherClass[]>();
    for (const c of dayClasses) bySection.set(c.sectionId, [...(bySection.get(c.sectionId) ?? []), c]);

    const merged: TeacherResolvedClass[] = [];
    for (const [sectionId, classes] of bySection) {
      const scheduleType = scheduleTypeByCampus.get(classes[0]!.campusId) ?? 'REGULAR';
      const day = resolveDay({
        classes: classes.map(SchedulingService.toInput),
        exceptions: (exceptionsBySection.get(sectionId) ?? []).map(SchedulingService.toException),
        scheduleType,
        dayOfWeek: dow,
      });
      for (const rc of day.classes) {
        const src = classes.find((c) => c.classNumber === rc.classNumber && c.scheduleType === scheduleType)!;
        merged.push({
          ...rc,
          sectionId,
          sectionName: src.sectionName,
          gradeNameEn: src.gradeNameEn,
          gradeNameAr: src.gradeNameAr,
        });
      }
    }
    merged.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const live = buildLiveContext(
      { scheduleType: 'REGULAR', dayOfWeek: dow, isHoliday: false, classes: merged },
      minutesOf(at),
    );
    return { date: isoDate(at), live, classes: merged };
  }

  async getCurrentTeacherClass(teacherId: string, at: Date = new Date()) {
    const { live } = await this.getTeacherDay(teacherId, at);
    return live;
  }

  // ----- Conflict detection & publishing ------------------------------------

  /** All conflicts in a plan (across every section). */
  async detectPlanConflicts(planId: string): Promise<Conflict[]> {
    const classes = await this.repo.loadPlanClasses(planId);
    return detectConflicts(classes as ConflictClassInput[]);
  }

  /** Validation result for the admin panel: the conflicts + whether the plan can be published. */
  async validatePlan(planId: string): Promise<{ conflicts: Conflict[]; canPublish: boolean }> {
    const conflicts = await this.detectPlanConflicts(planId);
    return { conflicts, canPublish: canPublish(conflicts) };
  }
}

// ----- helpers ---------------------------------------------------------------

function minutesOf(at: Date): number {
  return at.getUTCHours() * 60 + at.getUTCMinutes();
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

/** Group a flat class list into `{ dayOfWeek, classes[] }`, Sunday-first, ordered by class number. */
function groupByDay(classes: LoadedClass[]) {
  return DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    classes: classes
      .filter((c) => c.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.classNumber - b.classNumber),
  })).filter((d) => d.classes.length > 0);
}
