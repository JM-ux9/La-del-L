import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import "./Main.css";

const QUERY_PRODUCTOS = `
  query {
    productos(limite: 100) {
      id
      nombre
      precio
      categoria {
        id
      }
      imagen
      disponible
    }
  }
`;

function Main({ onVerProducto, busqueda }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargarProductos() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_PRODUCTOS);
      setProductos(data.productos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  if (cargando) {
    return (
      <main className="catalogo">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </main>
    );
  }

  if (error) return (
    <div>
      <p>Error: {error}</p>
      <button onClick={cargarProductos}>Reintentar</button>
    </div>
  );

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="catalogo">
      {productosFiltrados.map((producto) => (
        <ProductCard
          key={producto.id}
          producto={producto}
          onClick={() => onVerProducto(producto)}
        />
      ))}
    </main>
  );
}

export default Main;