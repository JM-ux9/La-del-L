import { useEffect, useRef, useState } from "react";
import { fetchGraphQL } from "../services/api";
import {
  consultarEstadoOrdenMercadoPago,
  crearOrdenMercadoPago,
  obtenerMercadoPago,
} from "../services/payments";
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
  const [resultadoPendiente, setResultadoPendiente] = useState(null);
  const pedidoPendiente = useRef(null);
  const claveIdempotencia = useRef(null);
  const brickContainer = useRef(null);
  const enviandoRef = useRef(false);
  const pagoIniciadoRef = useRef(false);

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
    if (
      !modalAbierto ||
      !mercadoPago ||
      !brickContainer.current ||
      pagoIniciadoRef.current ||
      resultadoPendiente
    ) return undefined;

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
            onSubmit: async (formData, additionalData) => {
              if (enviandoRef.current) return;
              enviandoRef.current = true;
              pagoIniciadoRef.current = true;
              setEnviando(true);
              setError(null);

              try {
                if (!activo) {
                  throw new Error("El formulario de pago ya no está disponible.");
                }

                const camposFaltantes = [
                  ["token", formData?.token],
                  ["payment_method_id", formData?.payment_method_id],
                  ["payment_type_id", additionalData?.paymentTypeId],
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

                if (Number(pedido.total).toFixed(2) !== Number(total).toFixed(2)) {
                  throw new Error(
                    "El total cambió desde que agregaste los productos. Actualiza el carrito antes de pagar."
                  );
                }

                if (!claveIdempotencia.current) {
                  claveIdempotencia.current = crypto.randomUUID();
                }

                const paymentMethodId = String(formData.payment_method_id);
                const resultadoOrden = await crearOrdenMercadoPago({
                  pedido_id: pedido.id,
                  token: formData.token,
                  payment_method_id: paymentMethodId,
                  payment_method_type: additionalData.paymentTypeId,
                  installments: Number(formData.installments),
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

                if (resultadoOrden.status !== "processed") {
                  setResultadoPendiente({
                    ...resultadoOrden,
                    pedido_id: pedido.id,
                  });
                  return;
                }

                vaciarCarrito();
                onPedidoCreado(pedido);
              } catch (err) {
                pagoIniciadoRef.current = false;
                const mensaje = err instanceof Error ? err.message : "Error desconocido al procesar el pago.";
                console.error("No se pudo procesar el pago del Checkout:", err);
                setError(mensaje);
                throw err;
              } finally {
                enviandoRef.current = false;
                setEnviando(false);
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
  }, [
    modalAbierto,
    mercadoPago,
    total,
    items,
    vaciarCarrito,
    onPedidoCreado,
    resultadoPendiente,
  ]);

  useEffect(() => {
    if (!resultadoPendiente?.pedido_id || resultadoPendiente.status === "canceled") {
      return undefined;
    }

    let activo = true;
    let temporizador;

    async function consultarEstado() {
      try {
        const resultado = await consultarEstadoOrdenMercadoPago(
          resultadoPendiente.pedido_id
        );
        if (!activo) return;

        if (resultado.status === "PAGADO") {
          const pedido = pedidoPendiente.current;
          setResultadoPendiente(null);
          vaciarCarrito();
          onPedidoCreado(pedido);
          return;
        }
        if (resultado.status === "RECHAZADO") {
          setResultadoPendiente((actual) => ({
            ...actual,
            status: "canceled",
          }));
          return;
        }
      } catch (err) {
        console.error("No se pudo consultar el estado de la orden:", err);
      }

      if (activo) {
        temporizador = window.setTimeout(consultarEstado, 5000);
      }
    }

    consultarEstado();
    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [
    resultadoPendiente?.pedido_id,
    resultadoPendiente?.status,
    vaciarCarrito,
    onPedidoCreado,
  ]);

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

            {resultadoPendiente ? (
              <div className="checkout-payment-pending" role="status">
                {resultadoPendiente.status === "canceled" ? (
                  <>
                    <p>El pago fue cancelado. Puedes intentar de nuevo con otra tarjeta.</p>
                    <button
                      className="checkout-submit"
                      type="button"
                      onClick={() => {
                        claveIdempotencia.current = null;
                        pagoIniciadoRef.current = false;
                        enviandoRef.current = false;
                        setResultadoPendiente(null);
                      }}
                    >
                      Intentar de nuevo
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      {resultadoPendiente.status === "action_required"
                        ? "Completa la verificación de tu tarjeta para continuar."
                        : "Estamos confirmando tu pago. No vuelvas a enviarlo; esta página se actualizará automáticamente."}
                    </p>
                    {resultadoPendiente.url && (
                      <iframe
                        title="Verificación segura de Mercado Pago"
                        src={resultadoPendiente.url}
                        className="checkout-payment-challenge"
                      />
                    )}
                    <a href="/mis-pedidos">Consultar mis pedidos</a>
                  </>
                )}
              </div>
            ) : (
              <>
                {!errorSdk && !brickListo && (
                  <p className="checkout-payment-loading">Cargando formulario de pago seguro...</p>
                )}
                <div
                  id="cardPaymentBrick_container"
                  ref={brickContainer}
                  className="checkout-card-payment-brick"
                />
              </>
            )}
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