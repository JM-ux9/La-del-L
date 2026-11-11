import { useState, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./MapaCafe.css";

const cafeIcon = L.icon({
  iconUrl: "/images/marker-icon.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapaCafe() {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCoords = async () => {
      try {
        const response = await fetch(
          "https://nominatim.openstreetmap.org/lookup?osm_ids=N11189581181&format=json"
        );
        if (!response.ok) throw new Error("Error al consultar la API de Nominatim");
        const data = await response.json();
        if (data && data.length > 0) {
          setCoords({
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
          });
        } else {
          setError("No se encontraron coordenadas para esta dirección");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCoords();
  }, []);

  if (loading) {
    return <div className="mapa-cafe">Cargando mapa...</div>;
  }

  if (error || !coords) {
    return <div className="mapa-cafe">{error || "No se pudo cargar el mapa"}</div>;
  }

  return (
    <MapContainer
      center={[coords.lat, coords.lon]}
      zoom={16}
      className="mapa-cafe"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[coords.lat, coords.lon]} icon={cafeIcon}>
        <Popup>Café del L</Popup>
      </Marker>
    </MapContainer>
  );
}
