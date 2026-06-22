-- Transport fares reference a shared fleet route (BusRoute) instead of a free-text label, so the
-- "route group" identity is the same in the Fleet tab and the Fee-configuration tab. The fare still
-- owns the amount; the route owns identity. Several fares can coexist per year + direction as long
-- as they point at different routes.
ALTER TABLE "TransportFare" ADD COLUMN "routeId" UUID;

ALTER TABLE "TransportFare"
  ADD CONSTRAINT "TransportFare_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Widen the per-year/direction uniqueness to include the route.
DROP INDEX IF EXISTS "TransportFare_tenantId_academicYearId_direction_key";
CREATE UNIQUE INDEX "TransportFare_tenantId_academicYearId_routeId_direction_key"
  ON "TransportFare" ("tenantId", "academicYearId", "routeId", "direction");

CREATE INDEX "TransportFare_routeId_idx" ON "TransportFare" ("routeId");
