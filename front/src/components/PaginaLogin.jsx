import Login from "../templates/Login";

function PaginaLogin() {
  function logueado() {
    window.location.href = "/";
  }

  return <Login onLogin={logueado} />;
}

export default PaginaLogin;