import { EnrollmentChangeService } from './enrollment-change.service';
import type { EnrollmentChangeRepository } from './enrollment-change.repository';

function make() {
  const transfer = jest.fn().mockResolvedValue({ id: 'e1' });
  const correctGrade = jest.fn();
  const repo = { transfer, correctGrade } as unknown as EnrollmentChangeRepository;
  return { service: new EnrollmentChangeService(repo), transfer, correctGrade };
}

describe('EnrollmentChangeService', () => {
  it('transfer delegates to the repository', async () => {
    const { service, transfer } = make();
    const res = await service.transfer('e1', { sectionId: 's2' });
    expect(transfer).toHaveBeenCalledWith('e1', { sectionId: 's2' });
    expect(res).toEqual({ enrollmentId: 'e1', transferred: true });
  });

  it('grade correction surfaces a fee warning when the grade actually changes', async () => {
    const { service, correctGrade } = make();
    correctGrade.mockResolvedValue({ enrollment: { id: 'e1' }, feesMayChange: true });
    const res = await service.correctGrade('e1', { gradeId: 'g1' });
    expect(res.feesMayChange).toBe(true);
    expect(res.feeWarning).toMatch(/review fees in Finance/i);
  });

  it('grade correction has no fee warning when the grade is unchanged', async () => {
    const { service, correctGrade } = make();
    correctGrade.mockResolvedValue({ enrollment: { id: 'e1' }, feesMayChange: false });
    const res = await service.correctGrade('e1', { gradeId: 'g1' });
    expect(res.feesMayChange).toBe(false);
    expect(res.feeWarning).toBeNull();
  });
});
