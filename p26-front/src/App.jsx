import { useState } from "react";
import Home from "./templates/Home";
import DetalleCategoria from "./templates/DetalleCategoria";
import DetalleProducto from "./templates/DetalleProducto";
import Carrito from "./templates/Carrito";
import Checkout from "./templates/Checkout";
import './App.css';

function App() {
  const [pantalla, setPantalla] = useState("home");
  const [categoriaId, setCategoriaId] = useState(null);
  const [productoId, setProductoId] = useState(null);

  function elegirCategoria(categoria) {
    setCategoriaId(categoria.id);
    setPantalla("categoria");
  }

  function verProducto(producto, categoriaOrigenId = producto.categoria?.id) {
    setProductoId(producto.id);
    setCategoriaId(categoriaOrigenId);
    setPantalla("producto");
  }

  function agregarAlCarritoYAvanzar() {
    setPantalla("carrito");
  }

  function finalizarCompra() {
    setPantalla("checkout");
  }

  function pedidoCreado() {
    setPantalla("home");
  }

  switch (pantalla) {
    case "categoria":
      return (
        <DetalleCategoria
          categoriaId={categoriaId}
          onVerProducto={verProducto}
          onVolver={() => setPantalla("home")}
        />
      );

    case "producto":
      return (
        <DetalleProducto
          productoId={productoId}
          onAgregado={agregarAlCarritoYAvanzar}
          onVolver={() => setPantalla("categoria")}
        />
      );

    case "carrito":
      return (
        <Carrito
          onFinalizarCompra={finalizarCompra}
          onVolver={() => setPantalla("home")}
        />
      );

    case "checkout":
      return (
        <Checkout
          onPedidoCreado={pedidoCreado}
          onVolver={() => setPantalla("carrito")}
        />
      );

    default:
      return (
        <Home
          onElegirCategoria={elegirCategoria}
          onVerProducto={verProducto}
          onIrACarrito={() => setPantalla("carrito")}
        />
      );
  }
}

export default App;