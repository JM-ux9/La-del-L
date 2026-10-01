import { CarritoProvider } from "../context/CarritoContext";
import DetalleProducto from "../templates/DetalleProducto";

function PaginaProducto({ productoId }) {
  function agregado() {
    window.location.href = "/carrito";
  }

  function volver() {
    window.history.back();
  }

  return (
    <CarritoProvider>
      <DetalleProducto
        productoId={productoId}
        onAgregado={agregado}
        onVolver={volver}
      />
    </CarritoProvider>
  );
}

export default PaginaProducto;