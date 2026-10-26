import { BookingFlow } from '@/components/booking-flow';
import type { Catalog } from '@/lib/types';
export const dynamic = 'force-dynamic';
async function getCatalog() {
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api/v1'}/catalog`,
      { cache: 'no-store', signal: AbortSignal.timeout(4000) },
    );
    return response.ok ? ((await response.json()) as Catalog) : null;
  } catch {
    return null;
  }
}
export default async function Home() {
  const catalog = await getCatalog();
  const structured = catalog
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: catalog.business.name,
        address: catalog.locations[0]?.address,
        priceRange: 'Bs',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Servicios',
          itemListElement: catalog.services.map((service) => ({
            '@type': 'Offer',
            price: service.price,
            priceCurrency: 'BOB',
            itemOffered: {
              '@type': 'Service',
              name: service.name,
              description: service.description,
            },
          })),
        },
      }
    : null;
  return (
    <main id="contenido">
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
        />
      )}
      <BookingFlow initialCatalog={catalog} />
    </main>
  );
}
