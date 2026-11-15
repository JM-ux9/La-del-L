import { obtenerToken } from "./auth";

const GRAPHQL_ENDPOINT =
  import.meta.env.PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql";
const API_BASE_URL = (
  import.meta.env.PUBLIC_API_URL || GRAPHQL_ENDPOINT.replace(/\/graphql\/?$/, "")
).replace(/\/$/, "");

export async function subirImagen(archivo) {
  const datos = new FormData();
  datos.append("archivo", archivo);

  const response = await fetch(`${API_BASE_URL}/v1/imagenes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${obtenerToken()}`,
    },
    body: datos,
  });

  const resultado = await response.json();

  if (!response.ok) {
    throw new Error(resultado.detail || "No se pudo subir la imagen");
  }

  return resultado.url;
}