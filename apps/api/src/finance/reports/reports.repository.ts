import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

export type FinanceDimension = 'academicYear' | 'grade' | 'campus' | 'category';

/** One aggregated row of the dimensional finance report. */
export interface DimensionRow {
  dimId: string | null;
  label: string;
  gross: string;
  discount: string;
  net: string;
  paid: string;
  outstanding: string;
  chargeCount: number;
}

/** Column + label join for each supported reporting dimension (RR-2/RR-3). */
const DIMENSION_SQL: Record<
  FinanceDimension,
  { column: string; joinTable: string; joinAlias: string; labelExpr: string }
> = {
  academicYear: { column: 'academicYearId', joinTable: 'AcademicYear', joinAlias: 'ay', labelExpr: 'ay.name' },
  grade: { column: 'gradeId', joinTable: 'Grade', joinAlias: 'g', labelExpr: 'g."nameEn"' },
  campus: { column: 'campusId', joinTable: 'Campus', joinAlias: 'cm', labelExpr: 'cm.name' },
  category: { column: 'feeItemId', joinTable: 'FeeItem', joinAlias: 'fi', labelExpr: 'fi."nameEn"' },
};

/**
 * Read-side dimensional finance reporting (RR-1: never reads write-model internals directly — it
 * aggregates the ledger). Revenue (gross/discount/net), collected (paid) and outstanding grouped
 * by academic year / grade / campus / fee category. One RLS-scoped SQL statement (efficient); every
 * figure is derived from the same source rows as the ledger (single source of truth).
 */
@Injectable()
export class FinanceReportsRepository extends TenantRepository {
  summaryByDimension(dimension: FinanceDimension): Promise<DimensionRow[]> {
    const dim = DIMENSION_SQL[dimension];
    if (!dim) throw new BadRequestException('Unsupported dimension');
    // Column/table/alias come from a fixed whitelist above (never user input) — safe to interpolate.
    const sql = Prisma.sql`
      WITH ch AS (
        SELECT id, "${Prisma.raw(dim.column)}" AS dim_id, amount
        FROM "Charge"
        WHERE status NOT IN ('CANCELLED', 'WRITTEN_OFF')
      ),
      disc AS (
        SELECT "chargeId", SUM(amount) AS s
        FROM "FeeAdjustment"
        WHERE status = 'APPLIED' AND "chargeId" IS NOT NULL
        GROUP BY "chargeId"
      ),
      pay AS (
        SELECT i."chargeId", SUM(pa.amount) AS s
        FROM "PaymentAllocation" pa
        JOIN "Installment" i ON i.id = pa."installmentId"
        WHERE pa."reversedAt" IS NULL
        GROUP BY i."chargeId"
      )
      SELECT
        ch.dim_id AS "dimId",
        COALESCE(${Prisma.raw(dim.labelExpr)}, '—') AS label,
        SUM(ch.amount)::text AS gross,
        COALESCE(SUM(disc.s), 0)::text AS discount,
        (SUM(ch.amount) - COALESCE(SUM(disc.s), 0))::text AS net,
        COALESCE(SUM(pay.s), 0)::text AS paid,
        (SUM(ch.amount) - COALESCE(SUM(disc.s), 0) - COALESCE(SUM(pay.s), 0))::text AS outstanding,
        COUNT(DISTINCT ch.id)::int AS "chargeCount"
      FROM ch
      LEFT JOIN disc ON disc."chargeId" = ch.id
      LEFT JOIN pay ON pay."chargeId" = ch.id
      LEFT JOIN "${Prisma.raw(dim.joinTable)}" ${Prisma.raw(dim.joinAlias)}
        ON ${Prisma.raw(dim.joinAlias)}.id = ch.dim_id
      GROUP BY ch.dim_id, ${Prisma.raw(dim.labelExpr)}
      ORDER BY outstanding DESC
    `;
    return this.run((tx) => tx.$queryRaw<DimensionRow[]>(sql));
  }
}
