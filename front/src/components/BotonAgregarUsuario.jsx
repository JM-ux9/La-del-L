import { useState } from "react";
import { createPortal } from "react-dom";
import "./BotonAgregar.css";

const API_URL = "http://localhost:8000/graphql";

function BotonAgregarUsuario() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function abrir() {
    setMostrarModal(true);
  }

  function cerrar() {
    setMostrarModal(false);
    setNombre("");
    setEmail("");
    setPassword("");
    setError("");
  }

  async function guardar() {
    if (nombre.trim() === "") {
      setError("El nombre es obligatorio");
      return;
    } else if (email.trim() === "") {
      setError("El correo es obligatorio");
      return;
    } else if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation CrearUsuario($datos: UsuarioInput!) {
              crearUsuario(datos: $datos) {
                id
                nombre
                email
                rol
              }
            }
          `,
          variables: { datos: { nombre, email, password } },
        }),
      });

      const resultado = await respuesta.json();

      if (resultado.errors) {
        setError(resultado.errors[0].message);
      } else {
        cerrar();
        window.location.reload();
      }
    } catch (e) {
      setError("No se pudo conectar con el servidor");
    }

    setCargando(false);
  }

  return (
    <>
      <button className="agregar-carrito" onClick={abrir}>
        Agregar usuario
      </button>
      {mostrarModal && createPortal(
        <div className="modal-fondo" onClick={cerrar}>
          <div
            className="modal modal-agregar-usuario"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-usuario-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-titulo" id="modal-usuario-titulo">Nuevo usuario</h2>
            <label className="modal-campo">
              <span>Nombre</span>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            <label className="modal-campo">
              <span>Correo electrónico</span>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="modal-campo">
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="modal-error" role="alert">{error}</p>}
            <div className="modal-acciones">
              <button onClick={cerrar}>Cancelar</button>
              <button className="modal-principal" onClick={guardar} disabled={cargando}>
                {cargando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default BotonAgregarUsuario;