import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agenda abierta · Reservas',
    short_name: 'Agenda abierta',
    description: 'Tu tiempo, bien reservado. Citas y servicios en Bolivia.',
    lang: 'es-BO',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F8FA',
    theme_color: '#16324F',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
