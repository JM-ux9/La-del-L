import { useEffect, useState } from "react";
import { fetchGraphQL } from "../services/api";
import "./BotonAgregar.css";

const QUERY_PEDIDOS_LISTOS = `
  query {
    pedidosListos(limite: 100) {
      id
      fecha
      total
      status
      usuario {
        nombre
      }
    }
  }
`;

const MUTATION_ENTREGADO = `
  mutation ($id: Int!) {
    setDelivered(id: $id)
  }
`;

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    return null;
  }
}

function PaginaAdminPedidosListos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [entregandoId, setEntregandoId] = useState(null);

  async function cargarPedidos() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_PEDIDOS_LISTOS);
      setPedidos(data.pedidosListos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const usuario = leerUsuario();
    if (!usuario || usuario.rol !== "ADMIN") {
      window.location.href = "/";
      return;
    }
    cargarPedidos();
  }, []);

  async function marcarEntregado(pedido) {
    if (!window.confirm(`¿Marcar el pedido #${pedido.id} como ENTREGADO?`)) {
      return;
    }
    
    setError(null);
    setEntregandoId(pedido.id);
    try {
      const resultado = await fetchGraphQL(MUTATION_ENTREGADO, { id: pedido.id });
      if (!resultado.setDelivered) {
        throw new Error("No se pudo marcar el pedido como entregado.");
      }
      const data = await fetchGraphQL(QUERY_PEDIDOS_LISTOS);
      setPedidos(data.pedidosListos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setEntregandoId(null);
    }
  }

  let contenido;
  if (cargando) {
    contenido = <p>Cargando pedidos...</p>;
  } else if (pedidos.length === 0) {
    contenido = <p>No hay pedidos listos para entregar.</p>;
  } else {
    contenido = (
      <div className="admin-tabla-contenedor">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <td>{pedido.id}</td>
                <td>{pedido.fecha}</td>
                <td>{pedido.usuario ? pedido.usuario.nombre : "—"}</td>
                <td>${Number(pedido.total).toFixed(2)}</td>
                <td>{pedido.status}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => marcarEntregado(pedido)}
                    disabled={entregandoId === pedido.id}
                  >
                    {entregandoId === pedido.id ? "Actualizando..." : "Marcar entregado"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="admin-pagina">
      <h2>Pedidos listos</h2>
      {error && <p className="admin-error">Error: {error}</p>}
      {contenido}
    </section>
  );
}

export default PaginaAdminPedidosListos;
