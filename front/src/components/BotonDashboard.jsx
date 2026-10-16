const ICONO_DASHBOARD = (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
    <g id="SVGRepo_bgCarrier" strokeWidth={0} />
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
    <g id="SVGRepo_iconCarrier">
      <defs>
        <style>{".cls-1{fill:none;stroke:#ffffff;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px;}"}</style>
      </defs>
      <title />
      <g id="dashboard">
        <line className="cls-1" x1="3" x2="29" y1="29" y2="29" />
        <line className="cls-1" x1="3" x2="3" y1="3" y2="29" />
        <line className="cls-1" x1="16" x2="16" y1="7" y2="25" />
        <line className="cls-1" x1="22" x2="22" y1="11" y2="25" />
        <line className="cls-1" x1="10" x2="10" y1="16" y2="25" />
      </g>
    </g>
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