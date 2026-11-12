import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import { useCarrito } from "../context/CarritoContext";
import { useDivisa } from "../store/divisa";
import DetalleProductoSkeleton from "../components/DetalleProductoSkeleton";
import { Image } from 'astro:assets';
import "./DetalleProducto.css";

const QUERY_PRODUCTO = `
  query($id: Int!) {
    producto(id: $id) {
      id
      nombre
      precio
      imagen
      disponible
      categoria {
        id
        nombre
      }
    }
  }
`;

function DetalleProducto({ productoId, onAgregado, onVolver }) {
  const { agregarAlCarrito } = useCarrito();
  const moneda = useDivisa((estado) => estado.moneda);
  const tasas = useDivisa((estado) => estado.tasas);
  const convertir = useDivisa((estado) => estado.convertir);
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  async function cargarProducto() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_PRODUCTO, { id: productoId });
      setProducto(data.producto);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProducto();
  }, [productoId]);

  if (cargando) {
    return (
      <div className="producto-page">
        <button className="producto-back" onClick={onVolver}>← Ver más</button>
        <div className="producto-skeleton">
          <DetalleProductoSkeleton />
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="producto-page">
      <div className="producto-error">
        <p>Error: {error}</p>
        <button onClick={cargarProducto}>Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="producto-page">
      <button className="producto-back" onClick={onVolver}>← Ver más</button>
      <article className="producto-detail">
        <div className="producto-image-wrap">
          <Image src={producto.imagen} alt={producto.nombre} />
        </div>
        <div className="producto-info">
          <h2><span className="aurora-text">{producto.nombre}</span></h2>
          <p className="producto-category">Categoría: {producto.categoria.nombre}</p>
          <p className="producto-price">{convertir(producto.precio).toFixed(2)} {moneda}</p>

          <label className="producto-quantity">
            Cantidad
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
            />
          </label>

          <button
            className="producto-submit"
            disabled={!producto.disponible}
            onClick={() => {
              agregarAlCarrito(producto, cantidad);
              onAgregado();
            }}
          >
            {producto.disponible ? "Agregar al carrito" : "No disponible"}
          </button>
        </div>
      </article>
    </div>
  );
}

export default DetalleProducto;