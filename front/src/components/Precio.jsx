import { useDivisa } from "../store/divisa";

function Precio({ valor }) {
  const moneda = useDivisa((estado) => estado.moneda);
  const tasas = useDivisa((estado) => estado.tasas);
  const convertir = useDivisa((estado) => estado.convertir);

  return <span>{convertir(valor).toFixed(2)} {moneda}</span>;
}

export default Precio;