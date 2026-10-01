import { CarritoProvider } from "../context/CarritoContext";
import Carrito from "../templates/Carrito";

function PaginaCarrito() {
  function finalizarCompra() {
    window.location.href = "/checkout";
  }

  function volver() {
    window.location.href = "/";
  }

  return (
    <CarritoProvider>
      <Carrito
        onFinalizarCompra={finalizarCompra}
        onVolver={volver}
      />
    </CarritoProvider>
  );
}

export default PaginaCarrito;