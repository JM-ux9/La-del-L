const ICONO_DASHBOARD = (
  <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <path d="M 64 64 h 128 v 128 H 64 z M 72 72 h 112 v 112 H 72 z" />
  </svg>
);

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function BotonDashboard() {
  const usuario = leerUsuario();
  if (!usuario || usuario.rol !== "ADMIN") {
    return null;
  }

  return (
    <button
      className="topbar-dashboard"
      title="Dashboard"
      aria-label="Dashboard"
    >
      {ICONO_DASHBOARD}
    </button>
  );
}

export default BotonDashboard;