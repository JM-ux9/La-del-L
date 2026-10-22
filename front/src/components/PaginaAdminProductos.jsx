import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";

const QUERY_DATOS = `
  query {
    productos(limite: 100) {
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
    categorias {
      id
      nombre
    }
  }
`;

const MUTATION_CREAR = `
  mutation ($datos: ProductoInput!) {
    crearProducto(datos: $datos) {
      id
    }
  }
`;

const MUTATION_ACTUALIZAR = `
  mutation ($id: Int!, $datos: ProductoInput!) {
    actualizarProducto(id: $id, datos: $datos) {
      id
    }
  }
`;

const MUTATION_ELIMINAR = `
  mutation ($id: Int!) {
    eliminarProducto(id: $id)
  }
`;

const FORM_VACIO = {
  nombre: "",
  precio: "",
  imagen: "",
  categoria: "",
  disponible: true,
};

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function PaginaAdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchGraphQL(QUERY_DATOS);
      setProductos(data.productos);
      setCategorias(data.categorias);
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
    } else {
      cargarDatos();
    }
  }, []);

  function cambiarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  function editar(producto) {
    setEditandoId(producto.id);
    setForm({
      nombre: producto.nombre,
      precio: String(producto.precio),
      imagen: producto.imagen || "",
      categoria: String(producto.categoria.id),
      disponible: producto.disponible,
    });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(FORM_VACIO);
  }

  async function guardar() {
    if (form.nombre.trim() === "" || form.precio === "" || form.categoria === "") {
      setError("Nombre, precio y categoría son obligatorios");
      return;
    }

    const datos = {
      nombre: form.nombre.trim(),
      precio: Number(form.precio),
      imagen: form.imagen.trim() === "" ? null : form.imagen.trim(),
      categoria: Number(form.categoria),
      disponible: form.disponible,
    };

    setGuardando(true);
    setError(null);
    try {
      if (editandoId === null) {
        await fetchGraphQL(MUTATION_CREAR, { datos });
      } else {
        await fetchGraphQL(MUTATION_ACTUALIZAR, { id: editandoId, datos });
      }
      cancelar();
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(producto) {
    if (!window.confirm(`¿Eliminar "${producto.nombre}"?`)) {
      return;
    }
    setError(null);
    try {
      await fetchGraphQL(MUTATION_ELIMINAR, { id: producto.id });
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    }
  }

  let contenido;
  if (cargando) {
    contenido = <p>Cargando productos...</p>;
  } else if (productos.length === 0) {
    contenido = <p>No hay productos.</p>;
  } else {
    contenido = (
      <div className="admin-tabla-contenedor">
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Disponible</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id}>
                <td><img src={producto.imagen} alt={producto.nombre} /></td>
                <td>{producto.nombre}</td>
                <td>{producto.categoria?.nombre}</td>
                <td>${Number(producto.precio).toFixed(2)}</td>
                <td>{producto.disponible ? "Sí" : "No"}</td>
                <td>
                  <div className="admin-acciones">
                    <button onClick={() => editar(producto)}>Editar</button>
                    <button className="admin-peligro" onClick={() => eliminar(producto)}>
                      Eliminar
                    </button>
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
      <h2>{editandoId === null ? "Nuevo producto" : `Editando producto #${editandoId}`}</h2>

      <div className="admin-form">
        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => cambiarCampo("nombre", e.target.value)} />
        </label>
        <label>
          Precio
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.precio}
            onChange={(e) => cambiarCampo("precio", e.target.value)}
          />
        </label>
        <label>
          Categoría
          <select value={form.categoria} onChange={(e) => cambiarCampo("categoria", e.target.value)}>
            <option value="">Selecciona...</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          URL de imagen
          <input value={form.imagen} onChange={(e) => cambiarCampo("imagen", e.target.value)} />
        </label>
        <label>
          Disponible
          <input
            type="checkbox"
            checked={form.disponible}
            onChange={(e) => cambiarCampo("disponible", e.target.checked)}
          />
        </label>
        <div className="admin-acciones">
          <button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : editandoId === null ? "Crear" : "Guardar cambios"}
          </button>
          {editandoId !== null && <button onClick={cancelar}>Cancelar</button>}
        </div>
      </div>

      {error && <p className="admin-error">Error: {error}</p>}

      <h2>Productos</h2>
      {contenido}
    </section>
  );
}

export default PaginaAdminProductos;