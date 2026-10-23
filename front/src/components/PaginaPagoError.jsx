import "./PaginaPagoError.css";

function PaginaPagoError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error") || "Ocurrió un error al procesar el pago.";
  const tipo = params.get("tipo") || "pago";

  function volverAlCheckout() {
    window.location.href = "/checkout/";
  }

  function volverAlInicio() {
    window.location.href = "/";
  }

  return (
    <section className="pago-error-page">
      <div className="pago-error-panel">
        <h2 className="pago-error-titulo">Error en el pago</h2>
        <p className="pago-error-mensaje">{error}</p>
        <div className="pago-error-actions">
          <button className="pago-error-volver" onClick={volverAlCheckout}>Volver al checkout</button>
          <button className="pago-error-inicio" onClick={volverAlInicio}>Ir al inicio</button>
        </div>
      </div>
    </section>
  );
}

export default PaginaPagoError;