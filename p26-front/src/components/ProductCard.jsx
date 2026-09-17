import './ProductCard.css';

function ProductCard({ producto, onClick }) {
  const precio = Number(producto.precio);

  return (
    <div className="product-card" onClick={onClick}>
      <img src={producto.imagen} alt={producto.nombre} />
      <h3>{producto.nombre}</h3>
      <p>{Number.isFinite(precio) ? `$${precio.toFixed(2)}` : "Precio no disponible"}</p>
    </div>
  );
}

export default ProductCard;