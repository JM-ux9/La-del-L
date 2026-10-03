import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import "./DetalleCategoria.css";

const QUERY_CATEGORIA = `
  query($id: Int!) {
    categoria(id: $id) {
      id
      nombre
      productos {
        id
        nombre
        precio
        imagen
        disponible
      }
    }
  }
`;

function DetalleCategoria({ categoriaId, onVerProducto, onVolver }) {
  const [categoria, setCategoria] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargarCategoria() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_CATEGORIA, { id: categoriaId });
      setCategoria(data.categoria);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCategoria();
  }, [categoriaId]);

  if (cargando) {
    return (
      <div className="categoria-page">
        <button className="categoria-back" onClick={onVolver}>← Volver</button>
        <main className="categoria-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </main>
      </div>
    );
  }

  if (error) return (
    <div className="categoria-page">
      <div className="categoria-error">
        <p>Error: {error}</p>
        <button onClick={cargarCategoria}>Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="categoria-page">
      <button className="categoria-back" onClick={onVolver}>← Volver</button>
      <header className="categoria-heading">
        <h2><span className="aurora-text3">{categoria.nombre}</span></h2>
      </header>
      <main className="categoria-grid">
        {categoria.productos.map((producto) => (
          <div
            key={producto.id}
            onClick={() => onVerProducto(producto, categoria.id)}
          >
            <ProductCard producto={producto} />
          </div>
        ))}
      </main>
    </div>
  );
}

export default DetalleCategoria;