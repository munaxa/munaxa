import { BadRequestException } from '@nestjs/common';
import { AcademicYearStatus, type AcademicYear } from '@prisma/client';
import { AcademicYearService } from './academic-year.service';
import type { AcademicYearRepository } from './academic-year.repository';

const YEAR = {
  id: 'ay1',
  campusId: 'c1',
  schoolId: 's1',
  name: '2025/2026',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-06-30'),
  status: AcademicYearStatus.UPCOMING,
  isCurrent: false,
} as AcademicYear;

/** Build a service with stubbed repo functions exposed for assertions. */
function setup(opts: { found?: AcademicYear | null; schoolId?: string | null } = {}) {
  const campusExists = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
  const campusSchoolId = jest
    .fn<Promise<string | null>, [string]>()
    .mockResolvedValue(opts.schoolId === undefined ? 's1' : opts.schoolId);
  const clearActiveForSchool = jest.fn().mockResolvedValue(undefined);
  const create = jest
    .fn()
    .mockImplementation((data) => Promise.resolve({ ...YEAR, ...data } as AcademicYear));
  const findById = jest
    .fn<Promise<AcademicYear | null>, [string]>()
    .mockResolvedValue(opts.found === undefined ? YEAR : opts.found);
  const update = jest
    .fn()
    .mockImplementation((_id, data) => Promise.resolve({ ...YEAR, ...data } as AcademicYear));
  const repo = {
    campusExists,
    campusSchoolId,
    clearActiveForSchool,
    create,
    findById,
    update,
  } as unknown as AcademicYearRepository;
  return {
    service: new AcademicYearService(repo),
    campusSchoolId,
    clearActiveForSchool,
    create,
    update,
  };
}

describe('AcademicYearService — School-scoped status machine (Decisions 1 & 8)', () => {
  it('derives schoolId from the campus and defaults status to UPCOMING', async () => {
    const { service, create, clearActiveForSchool } = setup();
    const year = await service.create({
      campusId: 'c1',
      name: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 's1' }));
    expect(year.status).toBe(AcademicYearStatus.UPCOMING);
    expect(clearActiveForSchool).not.toHaveBeenCalled();
  });

  it('maps the deprecated isCurrent=true to ACTIVE and supersedes other active years in the school', async () => {
    const { service, create, clearActiveForSchool } = setup();
    const year = await service.create({
      campusId: 'c1',
      name: '2026/2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      isCurrent: true,
    });
    expect(clearActiveForSchool).toHaveBeenCalledWith('s1', 'c1');
    expect(year.status).toBe(AcademicYearStatus.ACTIVE);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ isCurrent: true }));
  });

  it('supersedes the existing active year (excluding self) when a year is activated via update', async () => {
    const { service, clearActiveForSchool, update } = setup();
    await service.update('ay1', { status: AcademicYearStatus.ACTIVE });
    expect(clearActiveForSchool).toHaveBeenCalledWith('s1', 'c1', 'ay1');
    expect(update).toHaveBeenCalledWith(
      'ay1',
      expect.objectContaining({ status: AcademicYearStatus.ACTIVE, isCurrent: true }),
    );
  });

  it('close() flips status to CLOSED and clears the legacy flag', async () => {
    const { service, update } = setup();
    await service.close('ay1');
    expect(update).toHaveBeenCalledWith('ay1', {
      status: AcademicYearStatus.CLOSED,
      isCurrent: false,
    });
  });

  it('close() is idempotent on an already-closed year', async () => {
    const { service, update } = setup({
      found: { ...YEAR, status: AcademicYearStatus.CLOSED },
    });
    const year = await service.close('ay1');
    expect(year.status).toBe(AcademicYearStatus.CLOSED);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses deletion — academic years are never deletable', async () => {
    const { service } = setup();
    await expect(service.remove('ay1')).rejects.toThrow(BadRequestException);
  });
});
