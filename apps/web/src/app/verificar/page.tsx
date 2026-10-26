import { AuthAction } from '@/components/auth-action';
export const metadata = { title: 'Verificar correo', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="contenido" className="page-wrap content-page narrow">
      <AuthAction kind="verify" />
    </main>
  );
}
