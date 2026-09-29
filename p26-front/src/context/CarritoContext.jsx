import { createContext, useContext, useState } from "react";

const CarritoContext = createContext();

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([]);

  function agregarAlCarrito(producto, cantidad) {
    setItems((prev) => {
      const existente = prev.find((item) => item.producto.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }
      return [...prev, { producto, cantidad }];
    });
  }

  function quitarDelCarrito(productoId) {
    setItems((prev) => prev.filter((item) => item.producto.id !== productoId));
  }

  function cambiarCantidad(productoId, cantidad) {
    setItems((prev) =>
      prev.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      )
    );
  }

  function vaciarCarrito() {
    setItems([]);
  }

  const total = items.reduce(
    (acc, item) => acc + item.producto.precio * item.cantidad,
    0
  );

  return (
    <CarritoContext.Provider
      value={{ items, agregarAlCarrito, quitarDelCarrito, cambiarCantidad, vaciarCarrito, total }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  return useContext(CarritoContext);
}