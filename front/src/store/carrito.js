import { create } from "zustand";
import { claveCarrito } from "../services/auth";

export function calcularTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (acc, item) => acc + (Number(item?.producto?.precio) || 0) * (Number(item?.cantidad) || 0),
    0
  );
}

export const useCarrito = create((set, get) => ({
  items: [],
  cargado: false,

  cargarCarrito() {
    if (get().cargado) {
      return;
    }
    const clave = claveCarrito();
    let guardado = null;
    try {
        guardado = clave ? localStorage.getItem(clave) : null;
    } catch (e) {
        guardado = null;
    }
    let items = [];
    try {
        items = guardado ? JSON.parse(guardado) : [];
        if (!Array.isArray(items)) items = [];
    } catch (e) {
        items = [];
    }
    set({ items, cargado: true });
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

  olvidarCarrito() {
    set({ items: [], cargado: false });
  },
}));

useCarrito.subscribe((estado) => {
  if (typeof localStorage === "undefined") return;
  const clave = claveCarrito();
  if (estado.cargado && clave) {
    try {
      localStorage.setItem(clave, JSON.stringify(estado.items));
    } catch (e) {
    }
  }
});