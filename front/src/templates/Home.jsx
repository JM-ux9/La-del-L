import { useState } from "react";
import TopBar from "../components/TopBar";
import SideBar from "../components/SideBar";
import Hero from "../components/Hero";
import Main from "../components/Main";
import Context from "../components/Context";
import Footer from "../components/Footer";

function Home({ onElegirCategoria, onVerProducto, onIrACarrito }) {
  const [busqueda, setBusqueda] = useState("");

  return (
    <div>
      <TopBar
        onIrACarrito={onIrACarrito}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
      />
      <div style={{ display: "flex" }}>
        <SideBar onSeleccionarCategoria={onElegirCategoria} />
        <div style={{ flex: 1 }}>
          <Hero />
          <Main onVerProducto={onVerProducto} busqueda={busqueda} />
          <Context />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Home;