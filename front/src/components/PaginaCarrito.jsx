import { useEffect } from "react";
import { useCarrito } from "../store/carrito";
import Carrito from "../templates/Carrito";

function PaginaCarrito() {
  const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);

  useEffect(() => {
    cargarCarrito();
  }, []);

  function finalizarCompra() {
    window.location.href = "/checkout";
  }

  function volver() {
    window.location.href = "/";
  }

  return (
    <Carrito
      onFinalizarCompra={finalizarCompra}
      onVolver={volver}
    />
  );
}

export default PaginaCarrito;