import { useEffect, useRef, useState } from "react";
import { fetchGraphQL, procesarPago } from "../services/api";
import { useCarrito, calcularTotal } from "../store/carrito";
import "./Checkout.css";

const MERCADOPAGO_SDK_URL = "https://sdk.mercadopago.com/js/v2";
const MERCADOPAGO_PUBLIC_KEY = import.meta.env.PUBLIC_MERCADOPAGO_PUBLIC_KEY;
const BRICK_CONTAINER_ID = "cardPaymentBrick_container";

const MUTATION_CREAR_PEDIDO = `
  mutation($datos: PedidoInput!) {
    crearPedido(datos: $datos) {
      id
      total
      status
    }
  }
`;

let mercadoPagoSdkPromise;

function cargarSdkMercadoPago() {
  if (window.MercadoPago) {
    return Promise.resolve();
  }

  if (!mercadoPagoSdkPromise) {
    mercadoPagoSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = MERCADOPAGO_SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.MercadoPago) {
          resolve();
        } else {
          reject(new Error("No se pudo inicializar el SDK de Mercado Pago."));
        }
      };
      script.onerror = () => reject(new Error("No se pudo cargar el SDK de Mercado Pago."));
      document.head.appendChild(script);
    });
  }

  return mercadoPagoSdkPromise;
}

function Checkout({ onPedidoCreado, onVolver }) {
  const { items, cargado, vaciarCarrito } = useCarrito();
  const total = calcularTotal(items);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const pedidoId = useRef(null);

  useEffect(() => {
    if (!cargado || items.length === 0) {
      return undefined;
    }

    let cancelado = false;
    let controlador;

    async function montarBrick() {
      if (!MERCADOPAGO_PUBLIC_KEY) {
        throw new Error("Falta configurar PUBLIC_MERCADOPAGO_PUBLIC_KEY en el front.");
      }

      await cargarSdkMercadoPago();
      if (cancelado) return;

      const mp = new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY);
      const bricksBuilder = mp.bricks();
      const nuevoControlador = await bricksBuilder.create(
        "cardPayment",
        BRICK_CONTAINER_ID,
        {
          initialization: { amount: total },
          callbacks: {
            onReady: () => {},
            onSubmit: async (formData) => {
              setError(null);
              setMensaje(null);
              try {
                if (!pedidoId.current) {
                  const renglones = items.map((item) => ({
                    productoId: item.producto.id,
                    cantidad: item.cantidad,
                  }));
                  const data = await fetchGraphQL(MUTATION_CREAR_PEDIDO, {
                    datos: { renglones },
                  });
                  pedidoId.current = data.crearPedido.id;
                }

                const pago = await procesarPago({
                  pedido_id: pedidoId.current,
                  token: formData.token,
                  payment_method_id: formData.payment_method_id,
                  installments: formData.installments,
                  payer: formData.payer,
                });

                if (pago.status === "approved") {
                  vaciarCarrito();
                  onPedidoCreado(pago);
                  return;
                }

                if (pago.status === "pending" || pago.status === "in_process") {
                  setMensaje("Tu pago está en revisión. Te notificaremos cuando se confirme.");
                  return;
                }

                throw new Error(
                  pago.status_detail
                    ? `El pago no fue aprobado (${pago.status_detail}).`
                    : "El pago no fue aprobado. Verifica los datos e inténtalo de nuevo."
                );
              } catch (err) {
                setError(err.message);
                throw err;
              }
            },
            onError: (brickError) => {
              console.error("Error en el Brick de Mercado Pago:", brickError);
              setError("Ocurrió un error con el formulario de pago. Inténtalo de nuevo.");
            },
          },
        }
      );
      if (cancelado) {
        Promise.resolve(nuevoControlador.unmount()).catch((err) => {
          console.error("No se pudo desmontar el Brick de Mercado Pago:", err);
        });
      } else {
        controlador = nuevoControlador;
      }
    }

    montarBrick().catch((err) => {
      if (!cancelado) setError(err.message);
    });

    return () => {
      cancelado = true;
      if (controlador) {
        Promise.resolve(controlador.unmount()).catch((err) => {
          console.error("No se pudo desmontar el Brick de Mercado Pago:", err);
        });
      }
    };
  }, [cargado, items, total, onPedidoCreado, vaciarCarrito]);

  return (
    <div className="checkout-page">
      <button className="checkout-back" onClick={onVolver}>← Volver</button>
      <section className="checkout-panel">
        <h2>Confirma tu pedido</h2>

        {!cargado ? (
          <p>Cargando tu carrito...</p>
        ) : items.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <>
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
              <strong>${total.toFixed(2)}</strong>
            </div>

            {mensaje && <p className="checkout-message">{mensaje}</p>}
            {error && <p className="checkout-error">{error}</p>}
            <div id={BRICK_CONTAINER_ID} />
          </>
        )}
      </section>
    </div>
  );
}

export default Checkout;