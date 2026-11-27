import { useState, useEffect } from "react";
import AgregarDetalle from "./AgregarDetalle.jsx";

function DetalleOffline() {
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);

  async function cargarProducto() {
    const partes = window.location.pathname.split("/").filter((parte) => parte !== "");
    const id = partes[partes.length - 1];

    try {
      const respuesta = await fetch("/productos.json");
      const productos = await respuesta.json();
      const encontrado = productos.find((p) => String(p.id) === id);
      if (encontrado) {
        setProducto(encontrado);
        document.title = `${encontrado.nombre} | Café del L`;
      }
    } catch (err) {
      setProducto(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProducto();
  }, []);

  if (cargando) {
    return <p className="detalle-producto-inner">Cargando producto...</p>;
  } else if (!producto) {
    return (
      <section className="detalle-producto">
        <div className="detalle-producto-inner">
          <a className="detalle-producto-back" href="/">← Volver</a>
          <p>Este producto no está guardado en tu dispositivo y no hay conexión a internet.</p>
        </div>
      </section>
    );
  }

  const precio = Number(producto.precio);
  const precioFormateado = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(precio);

  return (
    <section className="detalle-producto">
      <div className="detalle-producto-inner">
        <a className="detalle-producto-back" href={`/categorias/${producto.categoria.id}`}>← Volver</a>

        <article className="detalle-producto-card">
          <figure className="detalle-producto-media">
            <img
              src={producto.imagen}
              alt={producto.nombre}
              width="500"
              height="500"
              style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }}
            />
          </figure>

          <div className="detalle-producto-info">
            <p className="detalle-producto-kicker">{producto.categoria.nombre}</p>
            <h2>{producto.nombre}</h2>
            <p className="detalle-producto-precio">
              {Number.isFinite(precio) ? precioFormateado : "Precio no disponible"}
            </p>

            {producto.disponible ? (
              <AgregarDetalle producto={producto} />
            ) : (
              <p className="detalle-producto-agotado">Agotado por ahora</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export default DetalleOffline;