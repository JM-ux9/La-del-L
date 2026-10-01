import { useCarrito } from "../context/CarritoContext";
import "./TopBar.css";

function TopBar({ onIrACarrito, busqueda, onBusquedaChange }) {
  const { items } = useCarrito();
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>Café del <span className="aurora-text2">L</span></h1>
        <button onClick={onIrACarrito}>
          🛒 ({totalItems})
        </button>
      </div>
      <div className="topbar-right">  
        <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        <img src="https://cdn-icons-png.flaticon.com/512/8230/8230211.png" width="40" height="40" alt="Logo" className="topbar-logo" />
      </div>
    </header>
  );
}

export default TopBar;