import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCarrito } from "../store/carrito";
import "./BotonAgregar.css";

function BotonAgregar({ producto }) {
  const agregarAlCarrito = useCarrito((estado) => estado.agregarAlCarrito);
  const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);
  const [mostrarModal, setMostrarModal] = useState(false);

  useEffect(() => {
    cargarCarrito();
  }, []);

  function agregar() {
    agregarAlCarrito(producto, 1);
    setMostrarModal(true);
  }

  function cerrar() {
    setMostrarModal(false);
  }

  function irAlCarrito() {
    window.location.href = "/carrito";
  }

  return (
    <>
      <button className="agregar-carrito" onClick={agregar} disabled={mostrarModal}>
        Agregar al carrito
      </button>
      {mostrarModal && createPortal(
        <div className="modal-fondo" onClick={cerrar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-titulo">Producto agregado</p>
            <p>{producto.nombre} se agregó a tu carrito.</p>
            <div className="modal-acciones">
              <button onClick={cerrar}>Seguir comprando</button>
              <button className="modal-principal" onClick={irAlCarrito}>Ir al carrito</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default BotonAgregar;