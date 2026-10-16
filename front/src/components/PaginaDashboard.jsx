import { useEffect, useState } from "react";
import { fetchGraphQL } from "../services/api";
import "./chart.css";

const QUERY_PRODUCTOS = `
  query {
    productosMasVendidos(limite: 10) {
      productoId
      nombre
      cantidadVendida
      totalVendido
    }
  }
`;

const QUERY_VENTAS = `
  query {
    ventasSemana {
      fecha
      total
      pedidos
    }
  }
`;

const QUERY_CATEGORIAS = `
  query {
    categoriasMasVendidas {
      categoriaId
      nombre
      cantidadVendida
      totalVendido
    }
  }
`;

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function PaginaDashboard() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const productosData = await fetchGraphQL(QUERY_PRODUCTOS);
      setProductos(productosData.productosMasVendidos || []);

      const ventasData = await fetchGraphQL(QUERY_VENTAS);
      setVentas(ventasData.ventasSemana || []);

      const categoriasData = await fetchGraphQL(QUERY_CATEGORIAS);
      setCategorias(categoriasData.categoriasMasVendidas || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const valorMaximo = (items, campo) => {
    if (items.length === 0) return 1;
    return Math.max(...items.map((item) => item[campo]));
  };

  const anchoBarra = (valor, maximo) => {
    if (maximo === 0) return 0;
    return (valor / maximo) * 100;
  };

  if (!leerUsuario() || leerUsuario().rol !== "ADMIN") {
    return (
      <section className="pagina-dashboard">
        <div className="dashboard-acceso-restringido">
          <h2>Acceso restringido</h2>
          <p>Esta pagina es solo para administradores.</p>
          <a href="/">Volver al inicio</a>
        </div>
      </section>
    );
  }

  if (cargando) {
    return (
      <section className="pagina-dashboard">
        <p>Cargando...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="pagina-dashboard">
        <p>Error: {error}</p>
        <button onClick={cargarDatos}>Reintentar</button>
      </section>
    );
  }

  const maxProductos = valorMaximo(productos, "cantidadVendida");
  const maxVentas = valorMaximo(ventas, "total");
  const maxCategorias = valorMaximo(categorias, "cantidadVendida");

  return (
    <section className="pagina-dashboard">
      <a style={{ paddingLeft: '0.5rem' }} className="dashboard-back" href="/">
        ← Volver
      </a>
      <h2 style={{ paddingLeft: '0.5rem' }}>Dashboard</h2>
      <div className="chart-container">
        <div className="chart-section">
          <h3>Productos más vendidos</h3>
          <div className="chart-bars">
            {productos.length === 0 ? (
              <p className="chart-empty">Sin datos</p>
            ) : (
              productos.map((producto) => (
                <div className="chart-bar" key={producto.productoId}>
                  <span className="chart-label">{producto.nombre}</span>
                  <div className="chart-bar-body">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${anchoBarra(producto.cantidadVendida, maxProductos)}%` }}
                    >
                      <span className="chart-value">{producto.cantidadVendida}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="chart-section">
          <h3>Categorías más vendidas</h3>
          <div className="chart-bars">
            {categorias.length === 0 ? (
              <p className="chart-empty">Sin datos</p>
            ) : (
              categorias.map((categoria) => (
                <div className="chart-bar" key={categoria.categoriaId}>
                  <span className="chart-label">{categoria.nombre}</span>
                  <div className="chart-bar-body">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${anchoBarra(categoria.cantidadVendida, maxCategorias)}%` }}
                    >
                      <span className="chart-value">{categoria.cantidadVendida}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="chart-section">
          <h3>Ventas por intervalo de tiempo</h3>
          <div className="chart-bars">
            {ventas.length === 0 ? (
              <p className="chart-empty">Sin datos</p>
            ) : (
              ventas.map((venta) => (
                <div className="chart-bar" key={venta.fecha}>
                  <span className="chart-label">{venta.fecha}</span>
                  <div className="chart-bar-body">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${anchoBarra(venta.total, maxVentas)}%` }}
                    >
                      <span className="chart-value">${venta.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PaginaDashboard;
