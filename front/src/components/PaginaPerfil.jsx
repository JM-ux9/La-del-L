import { useState } from "react";
import { fetchGraphQL } from "../services/api";
import "./PaginaPerfil.css";

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function PaginaPerfil() {
  const usuario = leerUsuario();
  const [nuevoNombre, setNuevoNombre] = useState(usuario?.nombre || "");
  const [email, setEmail] = useState(usuario?.email || "");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarError, setMostrarError] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  function volver() {
    window.location.href = "/";
  }

  async function guardarNombre() {
    if (!nuevoNombre.trim()) return;
    setEnviando(true);
    setMostrarError(false);
    try {
      await fetchGraphQL(
        `mutation($name: String!) { updateUsuario(name: $name) }`,
        { name: nuevoNombre.trim() }
      );
      const actualizado = JSON.parse(localStorage.getItem("usuario") || "null");
      if (actualizado) {
        actualizado.nombre = nuevoNombre.trim();
        localStorage.setItem("usuario", JSON.stringify(actualizado));
      }
      setMostrarConfirmacion(true);
    } catch (err) {
      setMostrarError(true);
      setMensajeError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarContrasenia() {
    if (nueva !== confirmar) {
      setMostrarError(true);
      setMensajeError("Las contraseñas no coinciden.");
      return;
    }
    if (nueva.length < 8) {
      setMostrarError(true);
      setMensajeError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setEnviando(true);
    setMostrarError(false);
    try {
      await fetchGraphQL(
        `mutation($pswd: String!, $newPswd: String!) { resetPassword(pswd: $pswd, newPswd: $newPswd) }`,
        { pswd: actual, newPswd: nueva }
      );
      setActual("");
      setNueva("");
      setConfirmar("");
      setMostrarConfirmacion(true);
    } catch (err) {
      setMostrarError(true);
      setMensajeError(err.message === "Credenciales inválidas" ? "La contraseña actual es incorrecta" : err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!usuario) {
    return (
      <section className="perfil-page">
        <a className="miPedido-back" href="/">← Volver</a>
        <h2>Perfil</h2>
        <p>No se pudo cargar la información del usuario.</p>
        <button className="perfil-volver" onClick={volver}>Ir al inicio</button>
      </section>
    );
  }

  function cerrarConfirmacion() {
    setMostrarConfirmacion(false);
  }

  function cerrarError() {
    setMostrarError(false);
  }

  return (
    <>
      <section className="perfil-page">
      <a className="miPedido-back" href="/">← Volver</a>
      <h2>Perfil</h2>

      <div className="perfil-panel">
        <div className="perfil-campo">
          <span>Nombre</span>
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder={usuario.nombre || ""}
            aria-label="Nombre"
          />
        </div>
        <button className="perfil-boton" onClick={guardarNombre} disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar nombre"}
        </button>

        <div className="perfil-divisor"></div>

        <div className="perfil-campo">
          <span>Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={usuario.email || ""}
            aria-label="Correo electrónico"
            disabled
          />
        </div>

        <div className="perfil-divisor"></div>

        <div className="perfil-campo">
          <span>Contraseña actual</span>
          <input
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="••••••••"
            aria-label="Contraseña actual"
          />
        </div>
        <div className="perfil-campo">
          <span>Nueva contraseña</span>
          <input
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            aria-label="Nueva contraseña"
          />
        </div>
        <div className="perfil-campo">
          <span>Confirmar nueva contraseña</span>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="••••••••"
            aria-label="Confirmar nueva contraseña"
          />
        </div>
        <button className="perfil-boton" onClick={cambiarContrasenia} disabled={enviando}>
          {enviando ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </div>
    </section>

    {mostrarConfirmacion && (
      <div className="perfil-confirmacion-backdrop" onClick={cerrarConfirmacion}>
        <div className="perfil-confirmacion" onClick={(e) => e.stopPropagation()}>
          <div className="perfil-confirmacion-logo">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="100" cy="100" r="80" fill="#2f7d32" />
              <path d="M 70 100 L 90 120 L 130 80" stroke="#FFF8E7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
          </div>
          <p className="perfil-confirmacion-mensaje">Los cambios se guardaron correctamente.</p>
          <button className="perfil-confirmacion-boton" type="button" onClick={cerrarConfirmacion}>Aceptar</button>
        </div>
      </div>
    )}
    {mostrarError && (
      <div className="perfil-error-backdrop" onClick={cerrarError}>
        <div className="perfil-error" onClick={(e) => e.stopPropagation()}>
          <div className="perfil-error-logo">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="100" cy="100" r="80" fill="#9b3d2c" />
              <path d="M 70 70 L 130 130" stroke="#FFF8E7" stroke-width="10" stroke-linecap="round" fill="none" />
              <path d="M 130 70 L 70 130" stroke="#FFF8E7" stroke-width="10" stroke-linecap="round" fill="none" />
            </svg>
          </div>
          <p className="perfil-error-mensaje">{mensajeError}</p>
          <button className="perfil-error-boton" type="button" onClick={cerrarError}>Aceptar</button>
        </div>
      </div>
    )}
    </>
    );
  }

export default PaginaPerfil;

