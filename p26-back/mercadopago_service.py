import os
from dotenv import load_dotenv

load_dotenv()


def crear_pago(datos: dict, idempotency_key: str) -> dict:
    access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
    if not access_token:
        raise RuntimeError("Falta configurar MERCADOPAGO_ACCESS_TOKEN.")

    import mercadopago

    sdk = mercadopago.SDK(access_token)
    request_options = mercadopago.config.RequestOptions(
        custom_headers={"x-idempotency-key": idempotency_key}
    )
    resultado = sdk.payment().create(datos, request_options)
    estado_http = resultado.get("status", 0)
    respuesta = resultado.get("response", {})

    if not 200 <= estado_http < 300:
        detalle = respuesta.get("message") or respuesta.get("cause") or "Error del proveedor de pagos."
        raise RuntimeError(str(detalle))
    if not respuesta.get("id") or not respuesta.get("status"):
        raise RuntimeError("Mercado Pago devolvió una respuesta de pago incompleta.")

    return respuesta