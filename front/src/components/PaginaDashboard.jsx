function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function PaginaDashboard() {
  const usuario = leerUsuario();
  const esAdmin = usuario && usuario.rol === "ADMIN";

  if (!esAdmin) {
    return (
      <section className="pagina-dashboard">
        <div className="dashboard-acceso-restringido">
          <h2>Acceso restringido</h2>
          <p>Esta pagina es solo para administradores.</p>
          <a href="/">Volver al inicio</a>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina-dashboard">
      <a href="/">← Volver</a>
      <h2>Dashboard</h2>
    </section>
  );
}

export default PaginaDashboard;
