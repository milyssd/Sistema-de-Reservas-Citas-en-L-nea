export const metadata = { title: 'Política de cookies' };
export default function Page() {
  return (
    <main id="contenido" className="page-wrap content-page narrow">
      <p className="eyebrow">Sin publicidad, sin rastreo</p>
      <h1>Política de cookies</h1>
      <p>
        Usamos una cookie esencial de sesión, denominada <code>refresh_token</code>, para mantener
        el acceso a tu cuenta. Es httpOnly, usa SameSite=Lax y Secure cuando el sitio funciona en
        producción con HTTPS. Se elimina al cerrar sesión y caduca según el plazo de sesión
        configurado.
      </p>
      <p>
        Tu elección sobre este aviso se guarda localmente en el navegador. No se instalan cookies de
        publicidad ni analítica. Si en el futuro se agregan, deberán contar con consentimiento
        previo y una opción para retirarlo.
      </p>
      <h2>Funcionamiento sin conexión</h2>
      <p>
        El service worker almacena archivos estáticos de la aplicación. Los datos personales de la
        API y las páginas privadas nunca se guardan automáticamente en esa caché. Puedes guardar una
        copia reducida de tus citas de forma explícita desde Mi cuenta y borrarla cerrando sesión o
        limpiando los datos del sitio.
      </p>
    </main>
  );
}
