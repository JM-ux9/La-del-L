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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-titulo">Nuevo usuario</p>
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p>{error}</p>}
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