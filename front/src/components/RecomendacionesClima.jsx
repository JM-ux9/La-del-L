import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import BotonAgregar from "./BotonAgregar.jsx";
import "./RecomendacionesClima.css";

const LATITUD = 20.7042;
const LONGITUD = -103.3925;
const URL_CLIMA = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}&current=temperature_2m,weather_code&timezone=America/Mexico_City`;

const QUERY_PRODUCTOS = `
  query ($temperatura: String!) {
    productosPorTemperatura(temperatura: $temperatura) {
      id
      nombre
      precio
      imagen
    }
  }
`;

function elegirTemperatura(grados, codigo) {
  if ((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 99)) {
    return "CALIENTE";
  } else if (grados < 20) {
    return "CALIENTE";
  } else if (grados > 26) {
    return "FRIO";
  } else {
    return null;
  }
}

function RecomendacionesClima() {
  const [grados, setGrados] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [productos, setProductos] = useState([]);

  async function cargarDatos() {
    try {
      const respuesta = await fetch(URL_CLIMA);
      const clima = await respuesta.json();
      const actual = clima.current;

      setGrados(actual.temperature_2m);
      const temperatura = elegirTemperatura(actual.temperature_2m, actual.weather_code);

      if (temperatura === "CALIENTE") {
        setMensaje("Está fresco, ¿qué tal algo calientito?");
      } else if (temperatura === "FRIO") {
        setMensaje("Hace calor, refréscate con algo frío");
      } else {
        return;
      }

      const data = await fetchGraphQL(QUERY_PRODUCTOS, { temperatura });
      console.log("productos recibidos:", data);
      setProductos(data.productosPorTemperatura);
    } catch (err) {
      console.log("error en recomendaciones:", err);
      setProductos([]);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  if (productos.length === 0) {
    return null;
  }

  return (
    <section className="recomendaciones-clima">
      <h2>{mensaje} ({Math.round(grados)}°C)</h2>
      <div className="recomendaciones-lista">
        {productos.map((producto) => (
          <div key={producto.id} className="recomendacion">
            <img src={producto.imagen} alt={producto.nombre} />
            <h3>{producto.nombre}</h3>
            <p>${Number(producto.precio).toFixed(2)}</p>
            <BotonAgregar producto={producto} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default RecomendacionesClima;