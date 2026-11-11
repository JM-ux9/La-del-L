import { useDivisa } from "../store/divisa";

function SelectorDivisa() {
  const moneda = useDivisa((estado) => estado.moneda);
  const establecerMoneda = useDivisa((estado) => estado.establecerMoneda);

  return (
    <label className="selector-divisa-label">
      Selecciona tu moneda:
      <select
        className="selector-divisa"
        value={moneda}
        onChange={(evento) => establecerMoneda(evento.target.value)}
      >
        <option value="MXN">MXN</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
    </label>
  );
}

export default SelectorDivisa;