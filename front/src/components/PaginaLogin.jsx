import Login from "../templates/Login";

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (e) {
    return null;
  }
}

function PaginaLogin() {
  function logueado() {
    const usuario = leerUsuario();
    if (usuario && usuario.rol === "ADMIN") {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/";
    }
  }

  return <Login onLogin={logueado} />;
}

export default PaginaLogin;