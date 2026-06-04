import { Module } from '@nestjs/common';
import { BusController } from './bus/bus.controller';
import { BusService } from './bus/bus.service';
import { BusRepository } from './bus/bus.repository';
import { LibraryController } from './library/library.controller';
import { LibraryService } from './library/library.service';
import { LibraryRepository } from './library/library.repository';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { InventoryRepository } from './inventory/inventory.repository';
import { ClinicController } from './clinic/clinic.controller';
import { ClinicService } from './clinic/clinic.service';
import { ClinicRepository } from './clinic/clinic.repository';

/**
 * Advanced modules (Phase 14): Bus Tracking, Library, Inventory, and School Clinic. Each
 * controller is gated by the `FeatureFlagGuard` + `@RequireFeature(...)` so the whole module is
 * **disabled by default** and only reachable once a tenant enables the corresponding flag via
 * `/feature-flags`.
 */
@Module({
  controllers: [BusController, LibraryController, InventoryController, ClinicController],
  providers: [
    BusService,
    BusRepository,
    LibraryService,
    LibraryRepository,
    InventoryService,
    InventoryRepository,
    ClinicService,
    ClinicRepository,
  ],
})
export class AdvancedModule {}
