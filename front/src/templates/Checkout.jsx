import { useState } from "react";
import { fetchGraphQL } from "../services/api";
import { useCarrito } from "../store/carrito";
import "./Checkout.css";

const MUTATION_CREAR_PEDIDO = `
  mutation($datos: PedidoInput!) {
    crearPedido(datos: $datos) {
      id
      total
      status
    }
  }
`;

function Checkout({ onPedidoCreado, onVolver }) {
  const { items, vaciarCarrito, total } = useCarrito();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function confirmarPedido() {
    setEnviando(true);
    setError(null);

    const renglones = items.map((item) => ({
      productoId: item.producto.id,
      cantidad: item.cantidad,
    }));

    try {
      const data = await fetchGraphQL(MUTATION_CREAR_PEDIDO, {
        datos: { renglones },
      });
      vaciarCarrito();
      onPedidoCreado(data.crearPedido);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="checkout-page">
      <button className="checkout-back" onClick={onVolver}>← Volver</button>
      <section className="checkout-panel">
        <h2>Confirma tu pedido</h2>

        <div className="checkout-items">
          {items.map((item) => (
            <div className="checkout-item" key={item.producto.id}>
              <span>{item.producto.nombre}</span>
              <span>x{item.cantidad}</span>
            </div>
          ))}
        </div>

        <div className="checkout-total">
          <span>Total</span>
          <span>${Number.isFinite(total) ? total.toFixed(2) : "0.00"}</span>
        </div>

        {error && <p className="checkout-error">Error al crear el pedido: {error}</p>}

        <button className="checkout-submit" onClick={confirmarPedido} disabled={enviando}>
          {enviando ? "Procesando..." : "Confirmar pedido"}
        </button>
      </section>
    </div>
  );
}

export default Checkout;