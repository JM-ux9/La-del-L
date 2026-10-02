// Helpers de sesión: guardan y leen los tokens del login en localStorage.

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
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("usuario");
}