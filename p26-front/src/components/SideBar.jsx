import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import CategoriaItem from "./CategoriaItem";
import CategoriaItemSkeleton from "./CategoriaItemSkeleton";
import './SideBar.css';

const QUERY_CATEGORIAS = `
  query {
    categorias {
      id
      nombre
    }
  }
`;

function SideBar({ onSeleccionarCategoria }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargarCategorias() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_CATEGORIAS);
      setCategorias(data.categorias);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCategorias();
  }, []);

  if (cargando) {
    return (
      <aside className="sidebar">
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <CategoriaItemSkeleton key={i} />
          ))}
        </ul>
      </aside>
    );
  }

  if (error) return (
    <div>
      <p>Error: {error}</p>
      <button onClick={cargarCategorias}>Reintentar</button>
    </div>
  );

  return (
    <aside className="sidebar">
      <ul>
        {categorias.map((categoria) => (
          <CategoriaItem
            key={categoria.id}
            categoria={categoria}
            onSeleccionar={onSeleccionarCategoria}
          />
        ))}
      </ul>
    </aside>
  );
}

export default SideBar;