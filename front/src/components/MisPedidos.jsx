import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import "./MisPedidos.css";

const QUERY_MIS_PEDIDOS = `
  query {
    misPedidos {
      id
      fecha
      total
      status
      detalles {
        cantidad
        producto {
          nombre
        }
      }
    }
  }
`;

function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargarPedidos() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_MIS_PEDIDOS);
      setPedidos(data.misPedidos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPedidos();
  }, []);

  let contenido;
  if (cargando) {
    contenido = <p>Cargando pedidos...</p>;
  } else if (error) {
    contenido = (
      <div>
        <p>Error: {error}</p>
        <button onClick={cargarPedidos}>Reintentar</button>
      </div>
    );
  } else if (pedidos.length === 0) {
    contenido = (
      <div>
        <p>Todavía no has hecho ningún pedido.</p>
        <a href="/">Ir al catálogo</a>
      </div>
    );
  } else {
    contenido = (
      <ul className="lista-pedidos">
        {pedidos.map((pedido) => (
          <li className="pedido" key={pedido.id}>
            <div className="pedido-encabezado">
              <strong>Pedido #{pedido.id}</strong>
              <span className={`pedido-status status-${pedido.status.toLowerCase()}`}>
                {pedido.status}
              </span>
            </div>
            <p className="pedido-fecha">{pedido.fecha}</p>
            <ul className="pedido-detalles">
              {pedido.detalles.map((detalle, i) => (
                <li key={i}>
                  {detalle.cantidad} × {detalle.producto.nombre}
                </li>
              ))}
            </ul>
            <p className="pedido-total">Total: ${pedido.total.toFixed(2)}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="mis-pedidos">
      <a className="miPedido-back" href="/">← Volver</a>
      <h2>Mis pedidos</h2>
      {contenido}
    </section>
  );
}

export default MisPedidos;