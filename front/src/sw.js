const PRECACHE = self.__WB_MANIFEST;

function calcularVersion(lista) {
  const texto = JSON.stringify(lista);
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

const VERSION = calcularVersion(PRECACHE);
const CACHE_SHELL = `shell-${VERSION}`;
const CACHE_PAGINAS = `paginas-${VERSION}`;
const CACHE_ASSETS = `assets-${VERSION}`;
const CACHE_IMAGENES = "imagenes-supabase";
const CACHES_ACTUALES = [CACHE_SHELL, CACHE_PAGINAS, CACHE_ASSETS, CACHE_IMAGENES];

const OFFLINE_URL = "/offline.html";
const PLANTILLA_PRODUCTO = "/producto-offline/";
const SUPABASE = "https://uofaxfmbilrtjorblprt.supabase.co";
const MAX_IMAGENES = 100;
const TIEMPO_RED = 4000;

function urlDelShell(entrada) {
  let url = "/" + entrada.url.replace(/^\//, "");
  if (url.endsWith("index.html")) {
    url = url.slice(0, -"index.html".length);
  }
  if (url === "/offline") {
    url = OFFLINE_URL;
  } else if (url === "/producto-offline") {
    url = PLANTILLA_PRODUCTO;
  }
  return url;
}

async function limpiarRedireccion(respuesta) {
  if (!respuesta.redirected) {
    return respuesta;
  }
  const cuerpo = await respuesta.blob();
  return new Response(cuerpo, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: respuesta.headers,
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      // Set quita los repetidos
      const urls = [...new Set(PRECACHE.map(urlDelShell))];
      for (const url of urls) {
        const respuesta = await fetch(new Request(url, { cache: "reload" }));
        if (!respuesta.ok) {
          throw new Error(`No se pudo guardar ${url} (${respuesta.status})`);
        }
        await cache.put(url, await limpiarRedireccion(respuesta));
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter((nombre) => !CACHES_ACTUALES.includes(nombre))
          .map((nombre) => caches.delete(nombre))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    if (esFichaProducto(url)) {
      event.respondWith(fichaProducto(request));
    } else if (esCatalogo(url)) {
      event.respondWith(networkFirst(request));
    } else {
      event.respondWith(soloRed(request));
    }
  } else if (url.origin === self.location.origin && url.pathname === "/productos.json") {
    // Los datos de la plantilla: frescos si hay red, guardados si no
    event.respondWith(networkFirst(request));
  } else if (esAsset(url)) {
    event.respondWith(cacheFirst(request, url));
  }
});

function esFichaProducto(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/products/");
}

function esCatalogo(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname === "/" || url.pathname.startsWith("/categorias/"))
  );
}

function esAsset(url) {
  if (url.origin === SUPABASE) {
    return true;
  }
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_astro/") ||
      url.pathname.startsWith("/images/") ||
      /\.(png|jpg|jpeg|webp|avif|svg|ico|woff2)$/.test(url.pathname))
  );
}

function conTiempoLimite(promesa, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("La red tardó demasiado")), ms);
    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_PAGINAS);
  try {
    const respuesta = await conTiempoLimite(fetch(request), TIEMPO_RED);
    if (respuesta.ok) {
      await cache.put(request, await limpiarRedireccion(respuesta.clone()));
    }
    return respuesta;
  } catch (error) {
    const guardada =
      (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ||
      (await caches.match(request, { ignoreSearch: true, ignoreVary: true })) ||
      (await buscarConSinDiagonal(request));
    if (guardada) {
      return guardada;
    }
    return caches.match(OFFLINE_URL, { ignoreVary: true });
  }
}

async function fichaProducto(request) {
  try {
    return await conTiempoLimite(fetch(request), TIEMPO_RED);
  } catch (error) {
    const plantilla = await caches.match(PLANTILLA_PRODUCTO, { ignoreVary: true });
    if (plantilla) {
      return plantilla;
    }
    return caches.match(OFFLINE_URL, { ignoreVary: true });
  }
}

async function buscarConSinDiagonal(request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  } else {
    url.pathname = url.pathname + "/";
  }
  return caches.match(url.href, { ignoreSearch: true, ignoreVary: true });
}

async function soloRed(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const guardada = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
    if (guardada) {
      return guardada;
    }
    return caches.match(OFFLINE_URL, { ignoreVary: true });
  }
}

async function cacheFirst(request, url) {
  const guardada = await caches.match(request, { ignoreVary: true });
  if (guardada) {
    return guardada;
  }

  const nombreCache = url.origin === SUPABASE ? CACHE_IMAGENES : CACHE_ASSETS;

  try {
    const respuesta = await fetch(request);
    if (respuesta.ok || respuesta.type === "opaque") {
      const cache = await caches.open(nombreCache);
      await cache.put(request, respuesta.clone());
      if (nombreCache === CACHE_IMAGENES) {
        await limitarCache(CACHE_IMAGENES, MAX_IMAGENES);
      }
    }
    return respuesta;
  } catch (error) {
    return new Response("", { status: 503, statusText: "Sin conexión y sin copia guardada" });
  }
}

async function limitarCache(nombre, maximo) {
  const cache = await caches.open(nombre);
  const llaves = await cache.keys();
  if (llaves.length > maximo) {
    for (const llave of llaves.slice(0, llaves.length - maximo)) {
      await cache.delete(llave);
    }
  }
}