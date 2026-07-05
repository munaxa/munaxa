import { headers } from 'next/headers';
import type { JsonLd as JsonLdData } from '@/lib/seo/jsonld';

/**
 * Renders one or more JSON-LD nodes as nonce'd <script type="application/ld+json"> tags.
 *
 * The CSP nonce is read from request headers automatically (set in middleware.ts), so
 * callers never have to thread it through. Pass a single node or an array.
 *
 * Server component — safe to drop anywhere in a server-rendered tree.
 */
export async function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const nodes = Array.isArray(data) ? data : [data];

  return (
    <>
      {nodes.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}
