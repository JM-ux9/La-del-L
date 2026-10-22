import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";

const QUERY_DATOS = `
  query {
    listarUsuarios {
      id
      nombre
      email
      rol
    }
  }
`;

const MUTATION_CREAR = `
  mutation ($datos: UsuarioInput!) {
    crearUsuario(datos: $datos) {
      id
    }
  }
`;

const MUTATION_ASCENDER = `
  mutation ($id: Int!) {
    ascendUser(id: $id)
  }
`;

const MUTATION_DESCENDER = `
  mutation ($id: Int!) {
    descendUser(id: $id)
  }
`;

const MUTATION_ACTUALIZAR = `
  mutation ($id: Int!, $nombre: String!) {
    actualizarNombreUsuario(id: $id, nombre: $nombre)
  }
`;

const MUTATION_ELIMINAR = `
  mutation ($id: Int!) {
    eliminarUsuario(id: $id)
  }
`;

const FORM_VACIO = {
    nombre: "",
    email: "",
    password: "",
    rol: "",
};


function leerUsuario() {
    try {
        return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch (e) {
        return null;
    }
}

function PaginaAdminUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
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
            setUsuarios(data.listarUsuarios);
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

    function editar(usuario) {
        setEditandoId(usuario.id);
        setForm({
            nombre: usuario.nombre,
            email: usuario.email,
            password: "",
            rol: usuario.rol,
        });
    }

    function cancelar() {
        setEditandoId(null);
        setForm(FORM_VACIO);
    }

    async function guardar() {
        if (form.nombre.trim() === "") {
            setError("El nombre es obligatorio");
            return;
        } else if (editandoId === null && (form.email.trim() === "" || form.rol === "")) {
            setError("Nombre, email y rol son obligatorios");
            return;
        } else if (editandoId === null && form.password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        setGuardando(true);
        setError(null);
        try {
            if (editandoId === null) {
                const datos = {
                    nombre: form.nombre.trim(),
                    email: form.email.trim(),
                    password: form.password,
                };
                const data = await fetchGraphQL(MUTATION_CREAR, { datos });
                if (form.rol === "ADMIN") {
                    await fetchGraphQL(MUTATION_ASCENDER, { id: data.crearUsuario.id });
                }
            } else {
                await fetchGraphQL(MUTATION_ACTUALIZAR, { id: editandoId, nombre: form.nombre.trim() });
            }
            cancelar();
            await cargarDatos();
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    }

    async function eliminar(usuario) {
        if (!window.confirm(`¿Eliminar "${usuario.nombre}"?`)) {
            return;
        }
        setError(null);
        try {
            await fetchGraphQL(MUTATION_ELIMINAR, { id: usuario.id });
            await cargarDatos();
        } catch (err) {
            setError(err.message);
        }
    }

    async function cambiarRol(usuario) {
        const nuevoRol = usuario.rol === "ADMIN" ? "CLIENTE" : "ADMIN";
        if (!window.confirm(`¿Cambiar el rol de "${usuario.nombre}" a ${nuevoRol}?`)) {
            return;
        }
        setError(null);
        try {
            if (usuario.rol === "ADMIN") {
                await fetchGraphQL(MUTATION_DESCENDER, { id: usuario.id });
            } else if (usuario.rol === "CLIENTE") {
                await fetchGraphQL(MUTATION_ASCENDER, { id: usuario.id });
            }
            await cargarDatos();
        } catch (err) {
            setError(err.message);
        }
    }

    let contenido;
    if (cargando) {
        contenido = <p>Cargando usuarios...</p>;
    } else if (usuarios.length === 0) {
        contenido = <p>No hay usuarios.</p>;
    } else {
        contenido = (
            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map((usuario) => (
                            <tr key={usuario.id}>
                                <td>{usuario.nombre}</td>
                                <td>{usuario.email}</td>
                                <td>{usuario.rol}</td>
                                <td>
                                    <div className="admin-acciones">
                                        <button onClick={() => editar(usuario)}>Editar</button>
                                        <button onClick={() => cambiarRol(usuario)}>
                                            {usuario.rol === "ADMIN" ? "Hacer cliente" : "Hacer admin"}
                                        </button>
                                        <button className="admin-peligro" onClick={() => eliminar(usuario)}>
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
            <h2>{editandoId === null ? "Nuevo usuario" : `Editando usuario #${editandoId}`}</h2>

            <div className="admin-form">
                <label>
                    Nombre
                    <input value={form.nombre} onChange={(e) => cambiarCampo("nombre", e.target.value)} />
                </label>
                {editandoId === null && (
                    <>
                        <label>
                            Email
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => cambiarCampo("email", e.target.value)}
                            />
                        </label>
                        <label>
                            Contraseña
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => cambiarCampo("password", e.target.value)}
                            />
                        </label>
                        <label>
                            Rol
                            <select value={form.rol} onChange={(e) => cambiarCampo("rol", e.target.value)}>
                                <option value="">Selecciona...</option>
                                <option value="CLIENTE">CLIENTE</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </label>
                    </>
                )}
                <div className="admin-acciones">
                    <button onClick={guardar} disabled={guardando}>
                        {guardando ? "Guardando..." : editandoId === null ? "Crear" : "Guardar cambios"}
                    </button>
                    {editandoId !== null && <button onClick={cancelar}>Cancelar</button>}
                </div>
            </div>

            {error && <p className="admin-error">Error: {error}</p>}

            <h2>Usuarios</h2>
            {contenido}
        </section>
    );
}

export default PaginaAdminUsuarios;