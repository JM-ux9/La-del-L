import mercadopago
from mercadopago.config import RequestOptions


def crear_pago(
    sdk: mercadopago.SDK,
    datos_pago: dict,
    idempotency_key: str,
) -> dict:
    return sdk.payment().create(
        datos_pago,
        request_options=RequestOptions(
            custom_headers={"X-Idempotency-Key": idempotency_key},
        ),
    )
