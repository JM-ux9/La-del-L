import { create } from "zustand";

export const useCarrito = create((set, get) => ({
  items: [],
  cargado: false,

  cargarCarrito() {
    if (get().cargado) {
      return;
    }
    const guardado = localStorage.getItem("carrito");
    if (guardado) {
      set({ items: JSON.parse(guardado), cargado: true });
    } else {
      set({ cargado: true });
    }
  },

  agregarAlCarrito(producto, cantidad) {
    set((estado) => {
      const existente = estado.items.find((item) => item.producto.id === producto.id);
      if (existente) {
        return {
          items: estado.items.map((item) =>
            item.producto.id === producto.id
              ? { ...item, cantidad: item.cantidad + cantidad }
              : item
          ),
        };
      }
      return { items: [...estado.items, { producto, cantidad }] };
    });
  },

  quitarDelCarrito(productoId) {
    set((estado) => ({
      items: estado.items.filter((item) => item.producto.id !== productoId),
    }));
  },

  cambiarCantidad(productoId, cantidad) {
    set((estado) => ({
      items: estado.items.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      ),
    }));
  },

  vaciarCarrito() {
    set({ items: [] });
  },
}));

useCarrito.subscribe((estado) => {
  if (estado.cargado) {
    localStorage.setItem("carrito", JSON.stringify(estado.items));
  }
});