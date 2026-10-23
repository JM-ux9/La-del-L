import { useEffect } from "react";
import { useCarrito } from "../store/carrito";
import Checkout from "../templates/Checkout";

function PaginaCheckout() {

    const cargarCarrito = useCarrito((estado) => estado.cargarCarrito);

    useEffect(() => {
        try {
            cargarCarrito();
        } catch (e) {
            console.error("Error al cargar el carrito:", e);
        }
    }, []);

    function pedidoCreado() {
        window.location.href = "/mis-pedidos?pago=exitoso";
    }

    function volver() {
        window.location.href = "/carrito";
    }

    return (
        <Checkout
            onPedidoCreado={pedidoCreado}
            onVolver={volver}
        />
    );
}

export default PaginaCheckout;