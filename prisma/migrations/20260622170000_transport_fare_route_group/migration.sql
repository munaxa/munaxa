-- Transport fares can now be split into user-defined route groups (e.g. "A,B,C" vs "D,E,F"),
-- each with its own direction + amount. Add the label (default '' for existing rows) and widen
-- the per-year/direction uniqueness to include the route group so several fares can coexist.
ALTER TABLE "TransportFare" ADD COLUMN IF NOT EXISTS "routeGroup" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "TransportFare_tenantId_academicYearId_direction_key";
CREATE UNIQUE INDEX "TransportFare_tenantId_academicYearId_routeGroup_direction_key"
  ON "TransportFare" ("tenantId", "academicYearId", "routeGroup", "direction");
