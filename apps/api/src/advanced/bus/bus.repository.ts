import { Injectable } from '@nestjs/common';
import type { Bus, BusRoute, BusStop, Prisma, StudentBusAssignment } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class BusRepository extends TenantRepository {
  createRoute(data: Omit<Prisma.BusRouteUncheckedCreateInput, 'tenantId'>): Promise<BusRoute> {
    return this.run((tx, tenantId) => tx.busRoute.create({ data: { ...data, tenantId } }));
  }

  listRoutes(): Promise<BusRoute[]> {
    return this.run((tx) =>
      tx.busRoute.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
    );
  }

  createBus(data: Omit<Prisma.BusUncheckedCreateInput, 'tenantId'>): Promise<Bus> {
    return this.run((tx, tenantId) => tx.bus.create({ data: { ...data, tenantId } }));
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
      const existing = await tx.studentBusAssignment.findFirst({
        where: { studentId: data.studentId, routeId: data.routeId },
      });
      if (existing) {
        return tx.studentBusAssignment.update({
          where: { id: existing.id },
          data: { stopId: data.stopId },
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
