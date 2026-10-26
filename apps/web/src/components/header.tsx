'use client';
import Link from 'next/link';
import { CalendarDays, ArrowUpRight } from 'lucide-react';
import { useAuth } from './providers';
export function Header() {
  const { user } = useAuth();
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <CalendarDays size={22} />
        </span>
        <span>
          agenda<span className="brand-light"> abierta</span>
          <small>Tu tiempo, bien reservado.</small>
        </span>
      </Link>
      <nav aria-label="Principal">
        <Link href="/#reservar">Reservar</Link>
        <Link href="/cuenta" className="account-link">
          {user ? 'Mi cuenta' : 'Ingresar'} <ArrowUpRight size={15} />
        </Link>
        {user && user.role !== 'CLIENT' && <Link href="/panel">Mi agenda</Link>}
      </nav>
    </header>
  );
}
