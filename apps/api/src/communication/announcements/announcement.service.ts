import { BadRequestException, Injectable } from '@nestjs/common';
import type { Announcement } from '@prisma/client';
import { AnnouncementRepository } from './announcement.repository';
import { DispatcherService } from '../dispatch/dispatcher.service';
import type { CreateAnnouncementDto } from './announcement.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly repo: AnnouncementRepository,
    private readonly dispatcher: DispatcherService,
  ) {}

  async create(dto: CreateAnnouncementDto): Promise<Announcement & { recipients: number }> {
    if (
      dto.audience === 'SECTION' &&
      dto.sectionId &&
      !(await this.repo.sectionExists(dto.sectionId))
    ) {
      throw new BadRequestException('Section not found in this tenant');
    }
    const announcement = await this.repo.create({
      title: dto.title,
      body: dto.body,
      audience: dto.audience,
      sectionId: dto.sectionId ?? null,
    });

    const { recipients } = await this.dispatcher.dispatch({
      audience: dto.audience,
      sectionId: dto.sectionId ?? null,
      title: dto.title,
      body: dto.body,
      category: 'announcement',
      announcementId: announcement.id,
    });

    return { ...announcement, recipients };
  }

  list(): Promise<Announcement[]> {
    return this.repo.findMany();
  }
}
