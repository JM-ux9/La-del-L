import { useEffect, useRef, useState } from "react";
import { fetchGraphQL } from "../services/api";
import { crearPagoMercadoPago, obtenerMercadoPago } from "../services/payments";
import { useCarrito, calcularTotal } from "../store/carrito";
import "./Checkout.css";

const MUTATION_CREAR_PEDIDO = `
  mutation($datos: PedidoInput!) {
    crearPedido(datos: $datos) {
      id
      total
      status
    }
  }
`;

function Checkout({ onPedidoCreado, onVolver }) {
  const { items, vaciarCarrito } = useCarrito();
  const total = calcularTotal(items);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mercadoPago, setMercadoPago] = useState(null);
  const [brickListo, setBrickListo] = useState(false);
  const [errorSdk, setErrorSdk] = useState(null);
  const [error, setError] = useState(null);
  const pedidoPendiente = useRef(null);
  const claveIdempotencia = useRef(null);
  const brickContainer = useRef(null);

  useEffect(() => {
    if (!modalAbierto) return undefined;

    let activo = true;
    obtenerMercadoPago()
      .then((cliente) => {
        if (activo) {
          setMercadoPago(cliente);
          setErrorSdk(null);
        }
      })
      .catch((err) => {
        if (activo) setErrorSdk(err.message);
      });

    return () => {
      activo = false;
      setMercadoPago(null);
    };
  }, [modalAbierto]);

  useEffect(() => {
    if (!modalAbierto || !mercadoPago || !brickContainer.current) return undefined;

    let activo = true;
    let brickController;
    setBrickListo(false);
    setError(null);

    async function renderCardPaymentBrick(bricksBuilder) {
      brickController = await bricksBuilder.create(
        "cardPayment",
        "cardPaymentBrick_container",
        {
          initialization: { amount: Number(total) },
          callbacks: {
            onReady: () => {
              if (activo) setBrickListo(true);
            },
            onSubmit: async (formData) => {
              setEnviando(true);
              setError(null);

              try {
                if (!activo) {
                  throw new Error("El formulario de pago ya no está disponible.");
                }

                const camposFaltantes = [
                  ["token", formData?.token],
                  ["payment_method_id", formData?.payment_method_id],
                  ["issuer_id", formData?.issuer_id],
                  ["installments", formData?.installments],
                  ["payer.email", formData?.payer?.email],
                ]
                  .filter(([, valor]) => valor === undefined || valor === null || valor === "")
                  .map(([campo]) => campo);

                if (camposFaltantes.length > 0) {
                  throw new Error(
                    `MercadoPago no devolvió estos datos: ${camposFaltantes.join(", ")}.`
                  );
                }

                let pedido = pedidoPendiente.current;
                if (!pedido) {
                  const renglones = items.map((item) => ({
                    productoId: item.producto.id,
                    cantidad: item.cantidad,
                  }));
                  const data = await fetchGraphQL(MUTATION_CREAR_PEDIDO, {
                    datos: { renglones },
                  });
                  pedido = data.crearPedido;
                  pedidoPendiente.current = pedido;
                }

                if (!claveIdempotencia.current) {
                  claveIdempotencia.current = crypto.randomUUID();
                }

                const resultadoPago = await crearPagoMercadoPago({
                  pedido_id: pedido.id,
                  token: formData.token,
                  payment_method_id: formData.payment_method_id,
                  installments: Number(formData.installments),
                  issuer_id: String(formData.issuer_id),
                  payer: {
                    email: formData.payer.email,
                    ...(formData.payer.identification?.type && formData.payer.identification?.number
                      ? {
                          identification: {
                            type: formData.payer.identification.type,
                            number: formData.payer.identification.number,
                          },
                        }
                      : {}),
                  },
                }, claveIdempotencia.current);

                if (resultadoPago.status !== "approved") {
                  if (resultadoPago.status === "rejected") {
                    claveIdempotencia.current = null;
                  }
                  throw new Error(
                    `El pago quedó ${resultadoPago.status}${resultadoPago.status_detail ? ` (${resultadoPago.status_detail})` : ""}.`
                  );
                }

                vaciarCarrito();
                onPedidoCreado(pedido);
              } catch (err) {
                const mensaje = err instanceof Error ? err.message : "Error desconocido al procesar el pago.";
                console.error("No se pudo procesar el pago del Checkout:", err);
                setError(mensaje);
                throw err;
              } finally {
                if (activo) setEnviando(false);
              }
            },
            onError: (err) => {
              console.error("Error en el formulario de pago de MercadoPago:", err);
              if (activo) {
                setError(
                  err?.message ||
                  (typeof err === "string" ? err : "Ocurrió un error en el formulario de pago.")
                );
              }
            },
          },
        }
      );

      if (!activo) {
        brickController.unmount();
      }
    }

    renderCardPaymentBrick(mercadoPago.bricks()).catch((err) => {
      if (activo) setErrorSdk(err.message);
    });

    return () => {
      activo = false;
      if (brickController) brickController.unmount();
      setBrickListo(false);
    };
  }, [modalAbierto, mercadoPago, total, items, vaciarCarrito, onPedidoCreado]);

  function cerrarModal() {
    if (!enviando) {
      setModalAbierto(false);
      setError(null);
      setErrorSdk(null);
      setBrickListo(false);
    }
  }

  return (
    <div className="checkout-page">
      <button className="checkout-back" onClick={onVolver}>← Volver</button>
      <section className="checkout-panel">
        <h2>Confirma tu pedido</h2>

        <div className="checkout-items">
          {items.map((item) => (
            <div className="checkout-item" key={item.producto.id}>
              <span>{item.producto.nombre}</span>
              <span>x{item.cantidad}</span>
            </div>
          ))}
        </div>

        <div className="checkout-total">
          <span>Total</span>
          <strong>${Number(total).toFixed(2)}</strong>
        </div>

        <button
          className="checkout-submit"
          onClick={() => setModalAbierto(true)}
          disabled={items.length === 0}
        >
          Pagar
        </button>
      </section>

      {modalAbierto && (
        <div className="checkout-modal-backdrop" onMouseDown={(evento) => {
          if (evento.target === evento.currentTarget) cerrarModal();
        }}>
          <section
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
          >
            <button
              className="checkout-modal-close"
              type="button"
              onClick={cerrarModal}
              aria-label="Cerrar"
              disabled={enviando}
            >
              ×
            </button>
            <h2 id="checkout-modal-title">Datos de pago</h2>
            <p className="checkout-modal-total">Total a pagar: ${Number(total).toFixed(2)}</p>

            {errorSdk && (
              <p className="checkout-error" role="alert">
                {errorSdk}
              </p>
            )}
            {error && <p className="checkout-error" role="alert">No se pudo completar el pago: {error}</p>}

            {!errorSdk && !brickListo && (
              <p className="checkout-payment-loading">Cargando formulario de pago seguro...</p>
            )}
            <div
              id="cardPaymentBrick_container"
              ref={brickContainer}
              className="checkout-card-payment-brick"
            />
            <div className="checkout-modal-actions">
              <button
                className="checkout-modal-cancel"
                type="button"
                onClick={cerrarModal}
                disabled={enviando}
              >
                Cancelar
              </button>
              {enviando && <span role="status">Procesando pago...</span>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Checkout;