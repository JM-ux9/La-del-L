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

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div className="login-page">
      <section className="login-panel">
        <h2>Inicia sesión</h2>

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
      </section>
    </div>
  );
}

export default Login;