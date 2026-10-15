import { useState, useEffect } from "react";
import { useCarrito } from "../store/carrito";

function BotonAgregar({ producto }) {
  const agregarAlCarrito = useCarrito((estado) => estado.agregarAlCarrito);
  const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);
  const [veces, setVeces] = useState(0);
  const [mostrarMensaje, setMostrarMensaje] = useState(false);

  useEffect(() => {
    cargarCarrito();
  }, []);

  useEffect(() => {
    if (veces > 0) {
      setMostrarMensaje(true);
      const temporizador = setTimeout(() => setMostrarMensaje(false), 2000);
      return () => clearTimeout(temporizador);
    }
  }, [veces]);

  function agregar() {
    agregarAlCarrito(producto, 1);
    setVeces(veces + 1);
  }

  return (
    <div>
      <button onClick={agregar}>Agregar al carrito</button>
      {mostrarMensaje && <p className="mensaje-agregado">✓ Producto agregado</p>}
    </div>
  );
}

export default BotonAgregar;