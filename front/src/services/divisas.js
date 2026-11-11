const cache = new Map();

export async function obtenerTasa(base, quote) {
  const clave = `${base}_${quote}`.toLowerCase();
  if (cache.has(clave)) return cache.get(clave);

  const respuesta = await fetch(`https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`);
  if (!respuesta.ok) throw new Error(`Error al obtener tasa: ${respuesta.status}`);

  const data = await respuesta.json();
  const tasa = Number(data.rate);
  if (!Number.isFinite(tasa)) throw new Error("Tasa inválida");

  cache.set(clave, tasa);
  return tasa;
}

export function limpiarCacheDivisas() {
  cache.clear();
}