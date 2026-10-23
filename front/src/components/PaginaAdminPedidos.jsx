import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import { suscribirPedidosEnVivo } from "../services/suscripciones";
const QUERY_DATOS = `
  query {
    pedidosPagados(limite: 100) {
      id
      fecha
      total
      status
      usuario {
        nombre
        email
      }
      detalles {
        id
        cantidad
        importe
        producto {
          nombre
        }
      }
    }
  }
`;

const MUTATION_EN_PROCESO = `
  mutation ($id: Int!) {
    setInProgress(id: $id)
  }
`;

const MUTATION_LISTO = `
  mutation ($id: Int!) {
    setReady(id: $id)
  }
`;

const MUTATION_ENTREGADO = `
  mutation ($id: Int!) {
    setDelivered(id: $id)
  }
`;

const MUTATION_CANCELADO = `
  mutation ($id: Int!) {
    setCanceled(id: $id)
  }
`;


function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function PaginaAdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [abiertoId, setAbiertoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_DATOS);
      setPedidos(data.pedidosPagados);
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

    let cancelar;

    (async () => {
      await cargarDatos();
      cancelar = suscribirPedidosEnVivo((pedido) => {
        setPedidos((prev) => {
          if (pedido.status !== "PAGADO") {
            return prev.filter((p) => p.id !== pedido.id);
          }
          const idx = prev.findIndex((p) => p.id === pedido.id);
          if (idx >= 0) {
            const siguiente = [...prev];
            siguiente[idx] = pedido;
            return siguiente;
          }
          return [pedido, ...prev];
        });
      }, (err) => {
        console.error('Error subscription:', err);
        setError(err?.message || 'Error en tiempo real');
      });
    })();

    return () => {
      if (cancelar) cancelar();
    };
  }, []);

  function verDetalle(pedido) {
    if (abiertoId === pedido.id) {
      setAbiertoId(null);
    } else {
      setAbiertoId(pedido.id);
    }
  }

  async function cambiarStatus(pedido, mutation, texto) {
    if (!window.confirm(`¿Marcar el pedido #${pedido.id} como ${texto}?`)) {
      return;
    }
    setError(null);
    try {
      await fetchGraphQL(mutation, { id: pedido.id });
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  function botonesStatus(pedido) {
    if (pedido.status === "PENDIENTE") {
      return (
        <>
          <button onClick={() => cambiarStatus(pedido, MUTATION_EN_PROCESO, "EN PROCESO")}>
            En proceso
          </button>
          <button className="admin-peligro" onClick={() => cambiarStatus(pedido, MUTATION_CANCELADO, "CANCELADO")}>
            Cancelar
          </button>
        </>
      );
    } else if (pedido.status === "EN PROCESO") {
      return (
        <>
          <button onClick={() => cambiarStatus(pedido, MUTATION_LISTO, "LISTO")}>
            Listo
          </button>
          <button className="admin-peligro" onClick={() => cambiarStatus(pedido, MUTATION_CANCELADO, "CANCELADO")}>
            Cancelar
          </button>
        </>
      );
    } else if (pedido.status === "LISTO") {
      return (
        <button onClick={() => cambiarStatus(pedido, MUTATION_ENTREGADO, "ENTREGADO")}>
          Entregado
        </button>
      );
    } else {
      return null;
    }
  }

  const pedidoAbierto = pedidos.find((pedido) => pedido.id === abiertoId);

  let contenido;
  if (cargando) {
    contenido = <p>Cargando pedidos...</p>;
  } else if (pedidos.length === 0) {
    contenido = <p>No hay pedidos pagados.</p>;
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
              <th>Status</th>
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
                  <div className="admin-acciones">
                    <button onClick={() => verDetalle(pedido)}>
                      {abiertoId === pedido.id ? "Ocultar" : "Ver"}
                    </button>
                    {botonesStatus(pedido)}
                  </div>
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
      {error && <p className="admin-error">Error: {error}</p>}

      <h2>Pedidos pagados</h2>
      {contenido}

      {pedidoAbierto && (
        <div className="admin-tabla-contenedor">
          <h2>Detalle del pedido #{pedidoAbierto.id}</h2>
          <p>
            {pedidoAbierto.usuario ? `${pedidoAbierto.usuario.nombre} (${pedidoAbierto.usuario.email})` : "—"}
          </p>
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {pedidoAbierto.detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td>{detalle.producto ? detalle.producto.nombre : "—"}</td>
                  <td>{detalle.cantidad}</td>
                  <td>${Number(detalle.importe).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default PaginaAdminPedidos;