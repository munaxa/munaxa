import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Global Prisma module so the data layer is available to every feature module. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
