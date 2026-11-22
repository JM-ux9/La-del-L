import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import { createPortal } from "react-dom";
import { suscribirPedidosEnVivo } from "../services/suscripciones";
import "./BotonAgregar.css";

const QUERY_DATOS = `
  query {
    pedidosPagados(limite: 100) {
      id
      fecha
      total
      status
      horaEntrega
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
  mutation ($id: Int!, $minutos: Int) {
    setInProgress(id: $id, minutos: $minutos)
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
  const [minutos, setMinutos] = useState({});

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

  async function recargarDatos() {
    try {
      const data = await fetchGraphQL(QUERY_DATOS);
      setPedidos(data.pedidosPagados);
    } catch (err) {
      setError(err.message);
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
    setAbiertoId(pedido.id);
  }

  function cerrarDetalle() {
    setAbiertoId(null);
  }

  async function cambiarStatus(pedido, mutation, texto) {
    if (!window.confirm(`¿Marcar el pedido #${pedido.id} como ${texto}?`)) {
      return;
    }
    setError(null);
    try {
      await fetchGraphQL(mutation, {
        id: pedido.id,
        minutos: minutos[pedido.id] ? Number(minutos[pedido.id]) : null,
      });
      await recargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  function botonesStatus(pedido) {
    if (pedido.status === "PAGADO") {
      return (
        <>
          <select
            className="admin-selector-tiempo"
            value={minutos[pedido.id] || ""}
            aria-label="Tiempo de preparación"
            onChange={(e) => setMinutos({ ...minutos, [pedido.id]: e.target.value })}
          >
            <option value="">15 min (por defecto)</option>
            <option value="20">20 min</option>
            <option value="25">25 min</option>
            <option value="30">30 min</option>
          </select>
          <button onClick={() => cambiarStatus(pedido, MUTATION_EN_PROCESO, "EN PROCESO")}>
            En proceso
          </button>
          <button className="admin-peligro" onClick={() => cambiarStatus(pedido, MUTATION_CANCELADO, "CANCELADO")}>
            Cancelar
          </button>
        </>
      );
    } else if (pedido.status === "PENDIENTE") {
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

  const pedidoAbierto = (pedidos || []).find((pedido) => pedido.id === abiertoId);

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
              <th scope="col">#</th>
              <th scope="col">Fecha</th>
              <th scope="col">Cliente</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <td data-label="#">{pedido.id}</td>
                <td data-label="Fecha">{pedido.fecha}</td>
                <td data-label="Cliente">{pedido.usuario ? pedido.usuario.nombre : "—"}</td>
                <td data-label="Total">${Number(pedido.total).toFixed(2)}</td>
                <td data-label="Status">{pedido.status}</td>
                <td data-label="Acciones">
                  <div className="admin-acciones">
                    <button onClick={() => verDetalle(pedido)}>Ver</button>
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

      {pedidoAbierto && createPortal(
        <div className="modal-fondo" onClick={cerrarDetalle}>
          <div className="modal modal-detalle" onClick={(e) => e.stopPropagation()}>
            <p className="modal-titulo">Pedido #{pedidoAbierto.id}</p>
            <p>
              {pedidoAbierto.usuario ? `${pedidoAbierto.usuario.nombre} (${pedidoAbierto.usuario.email})` : "—"}
            </p>
            <p>{pedidoAbierto.fecha} · {pedidoAbierto.status}</p>
            <p>Entrega: {pedidoAbierto.horaEntrega}</p>
            <div className="admin-tabla-contenedor">
              <table className="admin-tabla">
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col">Cantidad</th>
                    <th scope="col">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidoAbierto.detalles.map((detalle) => (
                    <tr key={detalle.id}>
                      <td data-label="Producto">{detalle.producto ? detalle.producto.nombre : "—"}</td>
                      <td data-label="Cantidad">{detalle.cantidad}</td>
                      <td data-label="Importe">${Number(detalle.importe).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p><strong>Total: ${Number(pedidoAbierto.total).toFixed(2)}</strong></p>
            <div className="modal-acciones">
              <button onClick={cerrarDetalle}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

export default PaginaAdminPedidos;