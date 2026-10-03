import { CarritoProvider } from "../context/CarritoContext";
import DetalleCategoria from "../templates/DetalleCategoria";

function PaginaCategoria({ categoriaId }) {
  function verProducto(producto) {
    window.location.href = `/products/${producto.id}`;
  }

  function volver() {
    window.history.back();
  }

  return (
    <CarritoProvider>
      <DetalleCategoria
        categoriaId={categoriaId}
        onVerProducto={verProducto}
        onVolver={volver}
      />
    </CarritoProvider>
  );
}

export default PaginaCategoria;