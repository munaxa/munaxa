-- ============================================================================
-- Enterprise scheduling engine.
--
-- Additive refactor of the timetable into a versioned, publishable plan hierarchy:
--   AcademicYear → Semester → SchedulePlan → SectionTimetable → ScheduledClass
--
-- The legacy TimetableSlot / ScheduleException / TimetableConfig tables are LEFT IN PLACE for the
-- transition. Section 3 below backfills existing TimetableSlot rows into a default PUBLISHED plan so
-- nothing is lost. Downstream readers switch to the published plan; the legacy resolver still works
-- against TimetableSlot until fully retired.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
CREATE TYPE "SchedulePlanStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "SpecialLocationKind" AS ENUM (
  'SCIENCE_LAB', 'COMPUTER_LAB', 'ART_ROOM', 'MUSIC_ROOM', 'SPORTS_HALL', 'LIBRARY', 'AUDITORIUM', 'OTHER'
);

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE "Subject" (
    "id"        UUID NOT NULL,
    "tenantId"  UUID NOT NULL,
    "nameEn"    TEXT NOT NULL,
    "nameAr"    TEXT NOT NULL,
    "code"      TEXT,
    "colorHex"  TEXT NOT NULL DEFAULT '#64748b',
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpecialLocation" (
    "id"        UUID NOT NULL,
    "tenantId"  UUID NOT NULL,
    "campusId"  UUID NOT NULL,
    "nameEn"    TEXT NOT NULL,
    "nameAr"    TEXT NOT NULL,
    "kind"      "SpecialLocationKind" NOT NULL DEFAULT 'OTHER',
    "capacity"  INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "SpecialLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BellSchedule" (
    "id"           UUID NOT NULL,
    "tenantId"     UUID NOT NULL,
    "campusId"     UUID NOT NULL,
    "name"         TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL DEFAULT 'REGULAR',
    "createdAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMPTZ(6) NOT NULL,
    "deletedAt"    TIMESTAMPTZ(6),
    CONSTRAINT "BellSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BellSchedulePeriod" (
    "id"             UUID NOT NULL,
    "tenantId"       UUID NOT NULL,
    "bellScheduleId" UUID NOT NULL,
    "classNumber"    INTEGER NOT NULL,
    "startTime"      TEXT NOT NULL,
    "endTime"        TEXT NOT NULL,
    "isBreak"        BOOLEAN NOT NULL DEFAULT false,
    "labelEn"        TEXT,
    "labelAr"        TEXT,
    "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "BellSchedulePeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulePlan" (
    "id"             UUID NOT NULL,
    "tenantId"       UUID NOT NULL,
    "semesterId"     UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "campusId"       UUID NOT NULL,
    "name"           TEXT NOT NULL,
    "status"         "SchedulePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt"    TIMESTAMPTZ(6),
    "publishedById"  UUID,
    "archivedAt"     TIMESTAMPTZ(6),
    "createdById"    UUID,
    "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMPTZ(6) NOT NULL,
    "deletedAt"      TIMESTAMPTZ(6),
    CONSTRAINT "SchedulePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SectionTimetable" (
    "id"        UUID NOT NULL,
    "tenantId"  UUID NOT NULL,
    "planId"    UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "SectionTimetable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledClass" (
    "id"                 UUID NOT NULL,
    "tenantId"           UUID NOT NULL,
    "sectionTimetableId" UUID NOT NULL,
    "scheduleType"       "ScheduleType" NOT NULL DEFAULT 'REGULAR',
    "dayOfWeek"          "DayOfWeek" NOT NULL,
    "classNumber"        INTEGER NOT NULL,
    "startTime"          TEXT NOT NULL,
    "endTime"            TEXT NOT NULL,
    "subjectId"          UUID NOT NULL,
    "teacherId"          UUID,
    "locationId"         UUID,
    "createdAt"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScheduledClass_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX "Subject_tenantId_idx" ON "Subject"("tenantId");
CREATE INDEX "Subject_tenantId_isActive_idx" ON "Subject"("tenantId", "isActive");
-- Tenant-scoped code uniqueness that ignores nulls and soft-deletes.
CREATE UNIQUE INDEX "Subject_tenantId_code_key" ON "Subject"("tenantId", "code")
  WHERE "code" IS NOT NULL AND "deletedAt" IS NULL;

CREATE INDEX "SpecialLocation_tenantId_campusId_idx" ON "SpecialLocation"("tenantId", "campusId");

CREATE INDEX "BellSchedule_tenantId_campusId_idx" ON "BellSchedule"("tenantId", "campusId");

CREATE UNIQUE INDEX "BellSchedulePeriod_bellScheduleId_classNumber_key" ON "BellSchedulePeriod"("bellScheduleId", "classNumber");
CREATE INDEX "BellSchedulePeriod_tenantId_bellScheduleId_idx" ON "BellSchedulePeriod"("tenantId", "bellScheduleId");

CREATE INDEX "SchedulePlan_tenantId_semesterId_idx" ON "SchedulePlan"("tenantId", "semesterId");
CREATE INDEX "SchedulePlan_tenantId_semesterId_status_idx" ON "SchedulePlan"("tenantId", "semesterId", "status");
-- At most one PUBLISHED plan per semester (ignoring soft-deleted rows).
CREATE UNIQUE INDEX "SchedulePlan_one_published_per_semester" ON "SchedulePlan"("semesterId")
  WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "SectionTimetable_planId_sectionId_key" ON "SectionTimetable"("planId", "sectionId");
CREATE INDEX "SectionTimetable_tenantId_planId_idx" ON "SectionTimetable"("tenantId", "planId");
CREATE INDEX "SectionTimetable_tenantId_sectionId_idx" ON "SectionTimetable"("tenantId", "sectionId");

CREATE UNIQUE INDEX "ScheduledClass_key" ON "ScheduledClass"("sectionTimetableId", "scheduleType", "dayOfWeek", "classNumber");
CREATE INDEX "ScheduledClass_tenantId_sectionTimetableId_idx" ON "ScheduledClass"("tenantId", "sectionTimetableId");
CREATE INDEX "ScheduledClass_tenantId_teacherId_idx" ON "ScheduledClass"("tenantId", "teacherId");
CREATE INDEX "ScheduledClass_tenantId_subjectId_idx" ON "ScheduledClass"("tenantId", "subjectId");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpecialLocation" ADD CONSTRAINT "SpecialLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpecialLocation" ADD CONSTRAINT "SpecialLocation_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BellSchedule" ADD CONSTRAINT "BellSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BellSchedule" ADD CONSTRAINT "BellSchedule_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BellSchedulePeriod" ADD CONSTRAINT "BellSchedulePeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BellSchedulePeriod" ADD CONSTRAINT "BellSchedulePeriod_bellScheduleId_fkey" FOREIGN KEY ("bellScheduleId") REFERENCES "BellSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulePlan" ADD CONSTRAINT "SchedulePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulePlan" ADD CONSTRAINT "SchedulePlan_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulePlan" ADD CONSTRAINT "SchedulePlan_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulePlan" ADD CONSTRAINT "SchedulePlan_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SectionTimetable" ADD CONSTRAINT "SectionTimetable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionTimetable" ADD CONSTRAINT "SectionTimetable_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SchedulePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionTimetable" ADD CONSTRAINT "SectionTimetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledClass" ADD CONSTRAINT "ScheduledClass_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledClass" ADD CONSTRAINT "ScheduledClass_sectionTimetableId_fkey" FOREIGN KEY ("sectionTimetableId") REFERENCES "SectionTimetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledClass" ADD CONSTRAINT "ScheduledClass_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledClass" ADD CONSTRAINT "ScheduledClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledClass" ADD CONSTRAINT "ScheduledClass_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SpecialLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Best-effort backfill of legacy TimetableSlot rows.
--
-- Legacy slots are not tied to a semester. For each campus that has an ACTIVE academic year with at
-- least one semester, we wrap that campus's existing slots into ONE published "Migrated Plan" on the
-- lowest-sequence semester. Campuses without an active year/semester are left untouched (admins build
-- fresh plans). Everything is guarded and idempotent-ish (guarded by NOT EXISTS on the plan name).
-- Legacy classroomId is intentionally dropped: normal lessons no longer display a room.
-- ---------------------------------------------------------------------------

-- 3a. One Subject per distinct legacy subject string (per tenant).
INSERT INTO "Subject" ("id", "tenantId", "nameEn", "nameAr", "updatedAt")
SELECT gen_random_uuid(), s."tenantId", s."subject", s."subject", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "tenantId", "subject" FROM "TimetableSlot") s
WHERE NOT EXISTS (
  SELECT 1 FROM "Subject" x WHERE x."tenantId" = s."tenantId" AND x."nameEn" = s."subject"
);

-- 3b. One PUBLISHED SchedulePlan per (campus with slots + active year + a semester).
--     The chosen semester is the lowest sequence of the campus's ACTIVE academic year.
WITH campus_target AS (
  SELECT DISTINCT
    g."campusId"                                             AS "campusId",
    sl."tenantId"                                            AS "tenantId",
    ay."id"                                                  AS "academicYearId",
    (SELECT sm."id" FROM "Semester" sm
       WHERE sm."academicYearId" = ay."id"
       ORDER BY sm."sequence" ASC LIMIT 1)                   AS "semesterId"
  FROM "TimetableSlot" sl
  JOIN "Section" sec ON sec."id" = sl."sectionId"
  JOIN "Grade" g     ON g."id" = sec."gradeId"
  JOIN "AcademicYear" ay ON ay."campusId" = g."campusId" AND ay."status" = 'ACTIVE'
)
INSERT INTO "SchedulePlan" ("id", "tenantId", "semesterId", "academicYearId", "campusId", "name", "status", "publishedAt", "updatedAt")
SELECT gen_random_uuid(), ct."tenantId", ct."semesterId", ct."academicYearId", ct."campusId",
       'Migrated Plan', 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM campus_target ct
WHERE ct."semesterId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SchedulePlan" p
    WHERE p."semesterId" = ct."semesterId" AND p."status" = 'PUBLISHED' AND p."deletedAt" IS NULL
  );

-- 3c. One SectionTimetable per section that has slots, under its campus's migrated plan.
INSERT INTO "SectionTimetable" ("id", "tenantId", "planId", "sectionId", "updatedAt")
SELECT gen_random_uuid(), sl."tenantId", p."id", sl."sectionId", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "tenantId", "sectionId" FROM "TimetableSlot") sl
JOIN "Section" sec ON sec."id" = sl."sectionId"
JOIN "Grade" g     ON g."id" = sec."gradeId"
JOIN "SchedulePlan" p ON p."campusId" = g."campusId" AND p."name" = 'Migrated Plan' AND p."status" = 'PUBLISHED'
WHERE NOT EXISTS (
  SELECT 1 FROM "SectionTimetable" st WHERE st."planId" = p."id" AND st."sectionId" = sl."sectionId"
);

-- 3d. Copy each legacy slot into a ScheduledClass (periodIndex → classNumber, subject string → Subject).
INSERT INTO "ScheduledClass" ("id", "tenantId", "sectionTimetableId", "scheduleType", "dayOfWeek", "classNumber", "startTime", "endTime", "subjectId", "teacherId", "updatedAt")
SELECT gen_random_uuid(), sl."tenantId", st."id", sl."scheduleType", sl."dayOfWeek", sl."periodIndex",
       sl."startTime", sl."endTime", subj."id", sl."teacherId", CURRENT_TIMESTAMP
FROM "TimetableSlot" sl
JOIN "Section" sec ON sec."id" = sl."sectionId"
JOIN "Grade" g     ON g."id" = sec."gradeId"
JOIN "SchedulePlan" p ON p."campusId" = g."campusId" AND p."name" = 'Migrated Plan' AND p."status" = 'PUBLISHED'
JOIN "SectionTimetable" st ON st."planId" = p."id" AND st."sectionId" = sl."sectionId"
JOIN "Subject" subj ON subj."tenantId" = sl."tenantId" AND subj."nameEn" = sl."subject"
WHERE NOT EXISTS (
  SELECT 1 FROM "ScheduledClass" sc
  WHERE sc."sectionTimetableId" = st."id" AND sc."scheduleType" = sl."scheduleType"
    AND sc."dayOfWeek" = sl."dayOfWeek" AND sc."classNumber" = sl."periodIndex"
);

-- ---------------------------------------------------------------------------
-- 4. Tenant isolation (RLS) for the new tables — same pattern as the timetable migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'Subject', 'SpecialLocation', 'BellSchedule', 'BellSchedulePeriod',
    'SchedulePlan', 'SectionTimetable', 'ScheduledClass'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING ("tenantId" = app_current_tenant() OR app_is_platform())
        WITH CHECK ("tenantId" = app_current_tenant() OR app_is_platform())
    $f$, t);
  END LOOP;
END $$;
