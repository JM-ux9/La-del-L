import { useState } from "react";
import { fetchGraphQL } from "../services/api";
import { guardarSesion } from "../services/auth";
import "./Login.css";

const MUTATION_LOGIN = `
  mutation($datos: LoginInput!) {
    login(datos: $datos) {
      accessToken
      refreshToken
      usuario {
        id
        nombre
        email
        rol
      }
    }
  }
`;

const MUTATION_CREAR_USUARIO = `
  mutation($datos: UsuarioInput!) {
    crearUsuario(datos: $datos) {
      id
      nombre
      email
      rol
    }
  }
`;

function Login({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  function cambiarModo(destino) {
    setModo(destino);
    setError(null);
  }

  async function iniciarSesion(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const data = await fetchGraphQL(MUTATION_LOGIN, {
        datos: { email, password },
      });

      guardarSesion(data.login);

      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function registrarse(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setEnviando(true);

    try {
      const data = await fetchGraphQL(MUTATION_CREAR_USUARIO, {
        datos: { nombre, email, password },
      });

      const correo = data.crearUsuario.email;

      const sesion = await fetchGraphQL(MUTATION_LOGIN, {
        datos: { email: correo, password },
      });

      guardarSesion(sesion.login);

      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-panel">
        <h2>{modo === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>

        {modo === "login" ? (
          <form className="login-form" onSubmit={iniciarSesion}>
            <label className="login-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <p className="login-error">Error al iniciar sesión: {error}</p>}

            <button className="login-submit" type="submit" disabled={enviando}>
              {enviando ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={registrarse}>
            <label className="login-field">
              <span>Nombre completo</span>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </label>

            <label className="login-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            <label className="login-field">
              <span>Confirmar contraseña</span>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                minLength={6}
                required
              />
            </label>

            {error && <p className="login-error">Error al registrarse: {error}</p>}

            <button className="login-submit" type="submit" disabled={enviando}>
              {enviando ? "Registrando..." : "Registrarse"}
            </button>
          </form>
        )}

        <p className="login-alternar">
          {modo === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button
            type="button"
            className="login-link"
            onClick={() => cambiarModo(modo === "login" ? "registro" : "login")}
          >
            {modo === "login" ? "Regístrate aquí" : "Inicia sesión"}
          </button>
        </p>
      </section>
    </div>
  );
}

export default Login;