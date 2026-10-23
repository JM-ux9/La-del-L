import { obtenerToken } from "./auth";

const GRAPHQL_ENDPOINT = import.meta.env.PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql";

function parseSSEEvents(buffer) {
  const eventos = [];
  const normalizado = buffer.replace(/\r\n/g, '\n');
  const bloques = normalizado.split('\n\n');
  const resto = bloques.pop() || "";

  for (const bloque of bloques) {
    const lineas = bloque.split('\n');
    let data = "";
    for (const linea of lineas) {
      if (linea.startsWith("data:")) {
        data += linea.slice(5).trim();
      }
    }
    if (data) {
      try {
        eventos.push(JSON.parse(data));
      } catch (e) {
      }
    }
  }

  return { eventos, resto };
}


export function suscribirGraphQL(query, variables = {}, { onData, onError, onComplete } = {}) {
  const controller = new AbortController();

  (async () => {
    let reintentos = 0;
    while (!controller.signal.aborted) {
      try {
        const token = typeof localStorage === "undefined" ? null : obtenerToken();

        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        reintentos = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { eventos, resto } = parseSSEEvents(buffer);
          buffer = resto;

          for (const payload of eventos) {
            if (payload.errors) {
              onError?.(new Error(payload.errors[0]?.message || "Error en subscription"));
              continue;
            }
            if (payload.data) {
              const clave = Object.keys(payload.data)[0];
              onData?.(payload.data[clave]);
            }
          }
        }

        onComplete?.();
        break;
      } catch (err) {
        if (controller.signal.aborted) break;
        onError?.(err);
        reintentos += 1;
        const espera = Math.min(1000 * 2 ** (reintentos - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, espera));
      }
    }
  })();

  return () => controller.abort();
}


const SUB_PEDIDOS_EN_VIVO = `
  subscription {
    pedidosEnVivo {
      id
      fecha
      total
      status
      usuario {
        nombre
        email
      }
      detalles {
        id
        cantidad
        importe
        producto {
          nombre
        }
      }
    }
  }
`;

const SUB_MIS_PEDIDOS_ACTIVOS = `
  subscription {
    misPedidosActivos {
      id
      fecha
      total
      status
      detalles {
        cantidad
        producto {
          nombre
        }
      }
    }
  }
`;

export function suscribirPedidosEnVivo(onData, onError) {
  return suscribirGraphQL(SUB_PEDIDOS_EN_VIVO, {}, { onData, onError });
}

export function suscribirMisPedidosActivos(onData, onError) {
  return suscribirGraphQL(SUB_MIS_PEDIDOS_ACTIVOS, {}, { onData, onError });
}

