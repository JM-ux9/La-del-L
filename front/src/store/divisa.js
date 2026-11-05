import { create } from "zustand";
import { obtenerTasa } from "../services/divisas";

const MONEDAS = ["MXN", "USD", "EUR"];

export const useDivisa = create((set, get) => ({
  moneda: "MXN",
  tasas: { USD: null, EUR: null },
  cargando: false,

  async establecerMoneda(moneda) {
    if (!MONEDAS.includes(moneda)) return;
    set({ moneda });
    try {
      localStorage.setItem("moneda", moneda);
    } catch (e) {}

    if (moneda !== "MXN" && !get().tasas[moneda]) {
      set({ cargando: true });
      try {
        const tasa = await obtenerTasa("mxn", moneda.toLowerCase());
        set((estado) => ({ tasas: { ...estado.tasas, [moneda]: tasa }, cargando: false }));
      } catch (e) {
        set({ cargando: false });
      }
    }
  },

  convertir(monto) {
    const { moneda, tasas } = get();
    const valor = Number(monto) || 0;
    if (moneda === "MXN" || !tasas[moneda]) return valor;
    return valor * tasas[moneda];
  },

  formatear(monto) {
    const { moneda } = get();
    const valor = get().convertir(monto);
    return `${valor.toFixed(2)} ${moneda}`;
  },
}));

if (typeof window !== "undefined") {
  try {
    const guardada = localStorage.getItem("moneda");
    if (guardada && MONEDAS.includes(guardada)) {
      useDivisa.getState().establecerMoneda(guardada);
    }
  } catch (e) {}
}