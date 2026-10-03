import { CarritoProvider } from "../context/CarritoContext";
import Home from "../templates/Home";

function Inicio() {
  function elegirCategoria(categoria) {
    window.location.href = `/categorias/${categoria.id}`;
  }

  function verProducto(producto) {
    window.location.href = `/products/${producto.id}`;
  }

  function irACarrito() {
    window.location.href = "/carrito";
  }

  return (
    <CarritoProvider>
      <Home
        onElegirCategoria={elegirCategoria}
        onVerProducto={verProducto}
        onIrACarrito={irACarrito}
      />
    </CarritoProvider>
  );
}

export default Inicio;