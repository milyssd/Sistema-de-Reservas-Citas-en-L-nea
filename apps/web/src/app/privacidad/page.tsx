export const metadata = { title: 'Privacidad' };
export default function Page() {
  return (
    <main id="contenido" className="page-wrap content-page narrow">
      <p className="eyebrow">Tus datos, con cuidado</p>
      <h1>Política de privacidad</h1>
      <p>
        El negocio que presta el servicio es responsable de los datos de sus clientes. Antes de
        publicar esta aplicación debe completar sus datos de contacto y plazos de conservación en la
        información del negocio.
      </p>
      <h2>Qué información usamos</h2>
      <p>
        Nombre, correo, celular y datos de las citas para gestionar reservas, avisos y pagos. No
        pedimos información clínica ni documentos de identidad en el formulario de reserva. Evita
        incluir información sensible en las notas.
      </p>
      <h2>Para qué se usa</h2>
      <p>
        Para prestar el servicio solicitado, enviar confirmaciones y recordatorios, resolver
        incidencias y mantener los registros contables que correspondan. El personal solo accede a
        lo necesario según sus permisos.
      </p>
      <h2>Tus opciones</h2>
      <p>
        Desde Mi cuenta puedes actualizar tus datos, elegir notificaciones, exportar tu información
        y solicitar la eliminación de tu cuenta. El historial necesario para obligaciones contables
        se conserva anonimizado según la política del negocio.
      </p>
      <h2>Almacenamiento local y comunicaciones</h2>
      <p>
        La información se almacena en el servidor del negocio. Si habilitas guardar tus citas sin
        conexión, una copia reducida queda en tu dispositivo hasta cerrar sesión o borrar los datos
        del navegador. Los proveedores de correo y push configurados por el negocio procesan solo
        los datos necesarios para enviar esos mensajes.
      </p>
      <h2>Contacto</h2>
      <p>
        Para ejercer tus derechos o consultar plazos de conservación, comunícate directamente con el
        negocio en los datos de contacto de su sede.
      </p>
    </main>
  );
}
