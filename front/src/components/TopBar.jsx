import { useCarrito } from "../context/CarritoContext";
import { fetchGraphQL } from "../services/api";
import { cerrarSesion } from "../services/auth";
import "./TopBar.css";

const MUTATION_LOGOUT = `
  mutation($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

function TopBar({ onIrACarrito, busqueda, onBusquedaChange }) {
  const { items } = useCarrito();
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  async function salir() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (refreshToken) {
      try {
        await fetchGraphQL(MUTATION_LOGOUT, { refreshToken });
      } catch (err) {
        //cerrar sesión aunque falle xd
      }
    }

    cerrarSesion();
    window.location.href = "/login";
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>Café del <span className="aurora-text2">L</span></h1>
        <button onClick={onIrACarrito}>
          🛒 ({totalItems})
        </button>
      </div>
      <div className="topbar-right">  
        <div className="topbar-busqueda">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
          <button className="topbar-logout" onClick={salir}>Cerrar sesión</button>
        </div>
        <img src="https://cdn-icons-png.flaticon.com/512/8230/8230211.png" width="40" height="40" alt="Logo" className="topbar-logo" />
      </div>
    </header>
  );
}

export default TopBar;