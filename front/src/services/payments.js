import { loadMercadoPago } from "@mercadopago/sdk-js";
import { obtenerToken } from "./auth";

const GRAPHQL_ENDPOINT =
  import.meta.env.PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql";
const API_BASE_URL = (
  import.meta.env.PUBLIC_API_URL || GRAPHQL_ENDPOINT.replace(/\/graphql\/?$/, "")
).replace(/\/$/, "");

export const ORDERS_ENDPOINT = `${API_BASE_URL}/v1/orders`;

export async function crearOrdenMercadoPago(datos, idempotencyKey) {
  const token = obtenerToken();
  if (!token) {
    throw new Error("Inicia sesión para realizar el pago");
  }

  const response = await fetch(ORDERS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(datos),
  });

  let resultado;
  try {
    resultado = await response.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  if (!response.ok) {
    const detalle = resultado.detail;
    const mensaje =
      typeof detalle === "string"
        ? detalle
        : detalle?.message || JSON.stringify(detalle) || `Error ${response.status}`;
    const error = new Error(mensaje);
    error.status = response.status;
    throw error;
  }

  return resultado;
}

export async function consultarEstadoOrdenMercadoPago(pedidoId) {
  const token = obtenerToken();
  if (!token) {
    throw new Error("Inicia sesión para consultar el estado del pedido");
  }

  const response = await fetch(`${ORDERS_ENDPOINT}/${pedidoId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let resultado;
  try {
    resultado = await response.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  if (!response.ok) {
    const detalle = resultado.detail;
    const mensaje =
      typeof detalle === "string"
        ? detalle
        : detalle?.message || JSON.stringify(detalle) || `Error ${response.status}`;
    const error = new Error(mensaje);
    error.status = response.status;
    throw error;
  }

  return resultado;
}

let mercadoPagoPromise;

export async function obtenerMercadoPago() {
  const publicKey = import.meta.env.PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Falta configurar la llave pública de MercadoPago");
  }

  if (!mercadoPagoPromise) {
    mercadoPagoPromise = loadMercadoPago();
  }
  await mercadoPagoPromise;

  return new window.MercadoPago(publicKey, { locale: "es-MX" });
}
