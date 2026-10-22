import { useEffect, useState } from "react";
import "./AvisoPago.css";

function AvisoPago() {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get("pago");
    if (pago !== "exitoso") return;

    setResultado(pago);
    params.delete("pago");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );

    const timeout = window.setTimeout(() => setResultado(null), 6000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!resultado) return null;

  return (
    <div className="aviso-pago aviso-pago--exitoso" role="status" aria-live="polite">
      <span>¡Pago realizado correctamente! Puedes consultar tu pedido aquí.</span>
      <button
        type="button"
        className="aviso-pago-cerrar"
        onClick={() => setResultado(null)}
        aria-label="Cerrar aviso"
      >
        ×
      </button>
    </div>
  );
}

export default AvisoPago;
