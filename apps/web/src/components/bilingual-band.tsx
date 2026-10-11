import { AttendancePair } from './mocks/school';
import { ProductScope } from './product-scope';

/**
 * "Built for the region": the same attendance card in English and Arabic. Always School's colours,
 * so on the hub it is wrapped in a School scope; on the School page that scope is the page theme.
 */
export function BilingualBand({
  id,
  text,
  scoped,
}: {
  id?: string;
  text: string;
  scoped?: boolean;
}) {
  const body = (
    <div className="mx-auto max-w-7xl px-8 py-24">
      <div className="grid grid-cols-1 items-center gap-x-18 gap-y-12 lg:grid-cols-3">
        <div className="flex max-w-md flex-col gap-4.5">
          <div className="text-sm font-semibold text-primary-700">Built for the region</div>
          <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight lg:text-4xl">
            Arabic and English, with right-to-left built in from the start.
          </h2>
          <p className="text-base leading-relaxed text-neutral-600">{text}</p>
        </div>
        <AttendancePair className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 lg:col-span-2" />
      </div>
    </div>
  );
  return scoped ? (
    <ProductScope as="section" product="school" id={id} className="bg-muted">
      {body}
    </ProductScope>
  ) : (
    <section id={id} className="bg-muted">
      {body}
    </section>
  );
}
