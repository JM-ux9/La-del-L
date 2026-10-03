import { useEffect } from "react";
import { useCarrito } from "../store/carrito";

function ContadorCarrito() {
  const items = useCarrito((estado) => estado.items);
  const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);

  useEffect(() => {
    cargarCarrito();
  }, []);

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <button onClick={() => (window.location.href = "/carrito")}>
      🛒 ({totalItems})
    </button>
  );
}

export default ContadorCarrito;