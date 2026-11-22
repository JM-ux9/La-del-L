import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import { subirImagen } from "../services/imagenes";

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
  const [subiendo, setSubiendo] = useState(false);

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

  async function seleccionarArchivo(e) {
    const archivo = e.target.files[0];
    if (!archivo) {
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const url = await subirImagen(archivo);
      cambiarCampo("imagen", url);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
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
              <th scope="col">Imagen</th>
              <th scope="col">Nombre</th>
              <th scope="col">Categoría</th>
              <th scope="col">Precio</th>
              <th scope="col">Disponible</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id}>
                <td data-label="Imagen"><img src={producto.imagen} alt={producto.nombre} /></td>
                <td data-label="Nombre">{producto.nombre}</td>
                <td data-label="Categoría">{producto.categoria?.nombre}</td>
                <td data-label="Precio">${Number(producto.precio).toFixed(2)}</td>
                <td data-label="Disponible">{producto.disponible ? "Sí" : "No"}</td>
                <td data-label="Acciones">
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
          <div className="admin-imagen">
            <input value={form.imagen} onChange={(e) => cambiarCampo("imagen", e.target.value)} />
            <label className="admin-subir">
              {subiendo ? "Subiendo..." : "Subir"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={seleccionarArchivo}
                disabled={subiendo}
                hidden
              />
            </label>
          </div>
          {form.imagen && <img src={form.imagen} alt="Vista previa" className="admin-preview" />}
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
          <button onClick={guardar} disabled={guardando || subiendo}>
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