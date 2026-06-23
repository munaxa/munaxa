import { Injectable } from '@nestjs/common';
import type { Bus, BusRoute, BusStop, Prisma, StudentBusAssignment } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class BusRepository extends TenantRepository {
  createRoute(data: Omit<Prisma.BusRouteUncheckedCreateInput, 'tenantId'>): Promise<BusRoute> {
    return this.run((tx, tenantId) => tx.busRoute.create({ data: { ...data, tenantId } }));
  }

  updateRoute(id: string, data: Prisma.BusRouteUpdateInput): Promise<BusRoute> {
    return this.run((tx) => tx.busRoute.update({ where: { id }, data }));
  }

  findRoute(id: string): Promise<BusRoute | null> {
    return this.run((tx) => tx.busRoute.findFirst({ where: { id, deletedAt: null } }));
  }

  listRoutes(academicYearId?: string): Promise<BusRoute[]> {
    return this.run((tx) =>
      tx.busRoute.findMany({
        where: { deletedAt: null, ...(academicYearId ? { academicYearId } : {}) },
        orderBy: { name: 'asc' },
      }),
    );
  }

  createBus(data: Omit<Prisma.BusUncheckedCreateInput, 'tenantId'>): Promise<Bus> {
    return this.run((tx, tenantId) => tx.bus.create({ data: { ...data, tenantId } }));
  }

  updateBus(id: string, data: Prisma.BusUpdateInput): Promise<Bus> {
    return this.run((tx) => tx.bus.update({ where: { id }, data }));
  }

  listBuses(): Promise<Bus[]> {
    return this.run((tx) =>
      tx.bus.findMany({ where: { deletedAt: null }, orderBy: { plateNumber: 'asc' } }),
    );
  }

  findBus(id: string): Promise<Bus | null> {
    return this.run((tx) => tx.bus.findFirst({ where: { id, deletedAt: null } }));
  }

  updateLocation(id: string, lat: number, lng: number): Promise<Bus> {
    return this.run((tx) =>
      tx.bus.update({
        where: { id },
        data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
      }),
    );
  }

  createStop(data: Omit<Prisma.BusStopUncheckedCreateInput, 'tenantId'>): Promise<BusStop> {
    return this.run((tx, tenantId) => tx.busStop.create({ data: { ...data, tenantId } }));
  }

  listStops(routeId: string): Promise<BusStop[]> {
    return this.run((tx) =>
      tx.busStop.findMany({ where: { routeId }, orderBy: { sequence: 'asc' } }),
    );
  }

  /** Whether another stop on the same route already uses this pickup time. */
  pickupTimeTaken(routeId: string, pickupTime: string): Promise<boolean> {
    return this.run(
      async (tx) => (await tx.busStop.findFirst({ where: { routeId, pickupTime } })) !== null,
    );
  }

  /** Whether the stop exists and belongs to the given route. */
  stopBelongsToRoute(stopId: string, routeId: string): Promise<boolean> {
    return this.run(
      async (tx) => (await tx.busStop.findFirst({ where: { id: stopId, routeId } })) !== null,
    );
  }

  routeExists(routeId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.busRoute.findFirst({ where: { id: routeId, deletedAt: null } })) !== null,
    );
  }

  assign(data: {
    studentId: string;
    routeId: string;
    stopId: string | null;
  }): Promise<StudentBusAssignment> {
    return this.run(async (tx, tenantId) => {
      // One assignment per student: reassigning moves them (route + stop) rather than adding a row.
      const existing = await tx.studentBusAssignment.findFirst({
        where: { studentId: data.studentId },
      });
      if (existing) {
        return tx.studentBusAssignment.update({
          where: { id: existing.id },
          data: { routeId: data.routeId, stopId: data.stopId },
        });
      }
      return tx.studentBusAssignment.create({ data: { ...data, tenantId } });
    });
  }

  listAssignments(routeId?: string): Promise<StudentBusAssignment[]> {
    return this.run((tx) =>
      tx.studentBusAssignment.findMany({
        where: { ...(routeId ? { routeId } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }
}
