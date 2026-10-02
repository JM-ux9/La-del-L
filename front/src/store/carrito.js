import { create } from "zustand";

function calcularTotal(items) {
  return items.reduce((acc, item) => {
    const precio = Number(item.producto?.precio);
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(precio) || !Number.isFinite(cantidad)) {
      return acc;
    }
    return acc + precio * cantidad;
  }, 0);
}

export const useCarrito = create((set, get) => ({
  items: [],
  total: 0,
  cargado: false,

  cargarCarrito() {
    if (get().cargado) {
      return;
    }
    let items = [];
    try {
      const guardado = localStorage.getItem("carrito");
      items = guardado ? JSON.parse(guardado) : [];
      if (!Array.isArray(items)) {
        items = [];
      }
    } catch (err) {
      items = [];
    }
    set({ items, total: calcularTotal(items), cargado: true });
  },

  agregarAlCarrito(producto, cantidad) {
    set((estado) => {
      const existente = estado.items.find((item) => item.producto.id === producto.id);
      const items = existente
        ? estado.items.map((item) =>
            item.producto.id === producto.id
              ? { ...item, cantidad: item.cantidad + cantidad }
              : item
          )
        : [...estado.items, { producto, cantidad }];
      return { items, total: calcularTotal(items) };
    });
  },

  quitarDelCarrito(productoId) {
    set((estado) => {
      const items = estado.items.filter((item) => item.producto.id !== productoId);
      return { items, total: calcularTotal(items) };
    });
  },

  cambiarCantidad(productoId, cantidad) {
    set((estado) => {
      const items = estado.items.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      );
      return { items, total: calcularTotal(items) };
    });
  },

  vaciarCarrito() {
    set({ items: [], total: 0 });
  },
}));

useCarrito.subscribe((estado) => {
  if (estado.cargado) {
    localStorage.setItem("carrito", JSON.stringify(estado.items));
  }
});