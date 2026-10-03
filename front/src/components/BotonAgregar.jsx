import { useEffect } from "react";
import { useCarrito } from "../store/carrito";

function BotonAgregar({ producto }) {
  const agregarAlCarrito = useCarrito((estado) => estado.agregarAlCarrito);
  const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);

  useEffect(() => {
    cargarCarrito();
  }, []);

  return (
    <button className="agregar-carrito" onClick={() => agregarAlCarrito(producto, 1)}>
      Agregar al carrito
    </button>
  );
}

export default BotonAgregar;