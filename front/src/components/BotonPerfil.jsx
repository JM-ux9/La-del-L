import { useEffect, useState } from "react";


const ICONO_PERFIL = (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
    <g id="SVGRepo_bgCarrier" strokeWidth={0} />
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
    <g id="SVGRepo_iconCarrier">
      <defs>
        <style>{".cls-1{fill:none;stroke:#ffffff;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px;}"}</style>
      </defs>
      <title />
      <g id="perfil">
        <circle className="cls-1" cx="16" cy="11" r="5" />
        <path className="cls-1" d="M6 27c0-5.5 4.5-10 10-10s10 4.5 10 10" />
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

function BotonPerfil() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    setUsuario(leerUsuario());
  }, []);

  if (!usuario) {
    return null;
  }

  return (
    <button
      className="topbar-perfil"
      title="Perfil"
      aria-label="Perfil"
      onClick={() => {
        window.location.href = "/perfil";
      }}
    >
      {ICONO_PERFIL}
    </button>
  );
}

export default BotonPerfil;