import { useState, useEffect } from "react";
import { useCarrito } from "../store/carrito";

function AgregarDetalle({ producto }) {
  const agregarAlCarrito = useCarrito((estado) => estado.agregarAlCarrito);
  const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    cargarCarrito();
  }, []);

  function agregar() {
    agregarAlCarrito(producto, cantidad);
    window.location.href = "/carrito";
  }

  return (
    <div className="acciones">
      <input
        type="number"
        min="1"
        value={cantidad}
        onChange={(e) => setCantidad(Number(e.target.value))}
      />
      <button onClick={agregar}>Agregar al carrito</button>
    </div>
  );
}

export default AgregarDetalle;