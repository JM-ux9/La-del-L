import { useState, useEffect } from "react";
import { fetchGraphQL } from "../services/api";
import { useCarrito, calcularTotal } from "../store/carrito";
import "./Checkout.css";
import React from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const MUTATION_CREAR_PEDIDO = `
  mutation($datos: PedidoInput!) {
    crearPedido(datos: $datos) {
      id
      total
      status
    }
  }
`;

initMercadoPago('APP_USR-8bfc9baa-0382-40bc-9c63-1d27439b906d');

function Checkout({ onPedidoCreado, onVolver }) {
  const { items, vaciarCarrito } = useCarrito();
  const total = calcularTotal(items);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [preferenceId, setPreferenceId] = useState(null);

  useEffect(() => {
    const createPreference = async () => {
    try {  
      const response = await fetch('http://localhost:8000/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: item.producto.precio,
          })),
        }),
      })
      if(response.ok){
        const data = await response.json();
        setPreferenceId(data.preference_id);
        console.log(data);
      }
    } catch (error){
      console.log(error);
    }
  }
  createPreference();
  }, [items])

  

  async function confirmarPedido() {
    setEnviando(true);
    setError(null);

    const renglones = items.map((item) => ({
      productoId: item.producto.id,
      cantidad: item.cantidad,
      precio: item.producto.precio
    }));

    try {
      const data = await fetchGraphQL(MUTATION_CREAR_PEDIDO, {
        datos: { renglones },
      });
      vaciarCarrito();
      onPedidoCreado(data.crearPedido);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
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
          <span>{total}</span>
        </div>

        {error && <p className="checkout-error">Error al crear el pedido: {error}</p>}
        
        {preferenceId && <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Wallet initialization={{ preferenceId: preferenceId }} />
        </div>}
        <button className="checkout-submit" onClick={confirmarPedido} disabled={enviando}>
          {enviando ? "Procesando..." : "Confirmar pedido"}
        </button>
      </section>
    </div>
  );
}

export default Checkout;