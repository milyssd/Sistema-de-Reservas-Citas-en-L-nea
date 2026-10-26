import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Agenda abierta · Reserva tu próximo momento',
    template: '%s · Agenda abierta',
  },
  description:
    'Reserva servicios y citas en Bolivia. Elige profesional, encuentra tu horario y confirma en minutos.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Agenda abierta' },
  openGraph: {
    locale: 'es_BO',
    type: 'website',
    title: 'Agenda abierta',
    description: 'Tu tiempo, bien reservado.',
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#16324F' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-BO">
      <body>
        <a href="#contenido" className="skip-link">
          Ir al contenido
        </a>
        <Providers>
          <Header />
          {children}
          <footer className="site-footer">
            <p>
              Agenda abierta <span>Hecho para tu día.</span>
            </p>
            <nav aria-label="Legal">
              <a href="/privacidad">Privacidad</a>
              <a href="/cookies">Cookies</a>
              <span>Bolivia · Bs</span>
            </nav>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
