import { CarritoProvider } from "../context/CarritoContext";
import Checkout from "../templates/Checkout";

function PaginaCheckout() {
  function pedidoCreado() {
    window.location.href = "/";
  }

  function volver() {
    window.location.href = "/carrito";
  }

  return (
    <CarritoProvider>
      <Checkout
        onPedidoCreado={pedidoCreado}
        onVolver={volver}
      />
    </CarritoProvider>
  );
}

export default PaginaCheckout;