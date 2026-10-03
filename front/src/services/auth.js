const PREFIJO_CARRITO = "carrito:";

const CARRITO_GLOBAL = "carrito";

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

export function claveCarrito() {
  const usuario = leerUsuario();
  return usuario?.id ? `${PREFIJO_CARRITO}${usuario.id}` : null;
}

export function guardarSesion(login) {
  localStorage.setItem("access_token", login.accessToken);
  localStorage.setItem("refresh_token", login.refreshToken);
  localStorage.setItem("usuario", JSON.stringify(login.usuario));
}

export function obtenerToken() {
  return localStorage.getItem("access_token");
}

export function tokenExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

export function sesionValida() {
  const token = obtenerToken();
  return Boolean(token) && !tokenExpirado(token);
}

export function cerrarSesion() {
  const clave = claveCarrito();
  if (clave) {
    localStorage.removeItem(clave);
  }
  localStorage.removeItem(CARRITO_GLOBAL);

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("usuario");
}