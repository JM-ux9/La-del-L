import { useCarrito } from "../store/carrito";
import "./Carrito.css";

function Carrito({ onFinalizarCompra, onVolver }) {
  const { items, quitarDelCarrito, cambiarCantidad, total } = useCarrito();

  if (items.length === 0) {
    return (
      <div className="carrito-page">
        <button className="carrito-back" onClick={onVolver}>← Volver</button>
        <section className="carrito-empty">
          <span className="carrito-empty-icon">🛒</span>
          <h2>Tu carrito está vacío</h2>
          <p>Agrega algo rico para comenzar tu pedido.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="carrito-page">
      <button className="carrito-back" onClick={onVolver}>← Volver</button>
      <header className="carrito-heading">
        <h2>Carrito</h2>
      </header>

      <section className="carrito-list">
        {items.map((item) => (
          <article className="carrito-item" key={item.producto.id}>
            <img src={item.producto.imagen} alt={item.producto.nombre} />
            <div className="carrito-item-info">
              <p className="carrito-item-name">{item.producto.nombre}</p>
              <p className="carrito-item-price">${Number(item.producto.precio).toFixed(2)}</p>
            </div>

            <input
              className="carrito-quantity"
              type="number"
              min="1"
              value={item.cantidad}
              onChange={(e) =>
                cambiarCantidad(item.producto.id, Math.max(1, Number(e.target.value)))
              }
            />

            <button className="carrito-remove" onClick={() => quitarDelCarrito(item.producto.id)}>
              Quitar
            </button>
          </article>
        ))}
      </section>

      <section className="carrito-summary">
        <div>
          <span>Total</span>
          <strong>${Number(total).toFixed(2)}</strong>
        </div>

        <button className="carrito-submit" onClick={onFinalizarCompra}>Finalizar compra</button>
      </section>
    </div>
  );
}

export default Carrito;