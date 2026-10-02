import { fetchGraphQL } from "../services/api";
import { cerrarSesion } from "../services/auth";

const MUTATION_LOGOUT = `
  mutation($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

function BotonCerrarSesion() {
  async function salir() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (refreshToken) {
      try {
        await fetchGraphQL(MUTATION_LOGOUT, { refreshToken });
      } catch (err) {
      
      }
    }

    cerrarSesion();
    window.location.href = "/login";
  }

  return <button className="topbar-logout" onClick={salir}>Cerrar sesión</button>;
}

export default BotonCerrarSesion;