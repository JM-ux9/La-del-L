import hashlib
import hmac

import mercadopago
from mercadopago.config import RequestOptions


def crear_orden(
    sdk: mercadopago.SDK,
    datos_orden: dict,
    idempotency_key: str,
) -> dict:
    return sdk.order().create(
        datos_orden,
        request_options=RequestOptions(
            custom_headers={"X-Idempotency-Key": idempotency_key},
        ),
    )


def obtener_orden(sdk: mercadopago.SDK, order_id: str) -> dict:
    return sdk.order().get(order_id)


def validar_firma_webhook(
    secret: str,
    signature: str | None,
    request_id: str | None,
    data_id: str | None,
) -> bool:
    if not signature or not request_id or not data_id:
        return False

    campos = {}
    for campo in signature.split(","):
        clave, separador, valor = campo.strip().partition("=")
        if separador:
            campos[clave] = valor

    timestamp = campos.get("ts")
    firma_recibida = campos.get("v1")
    if not timestamp or not firma_recibida:
        return False

    manifiesto = f"id:{data_id.lower()};request-id:{request_id};ts:{timestamp};"
    firma_esperada = hmac.new(
        secret.encode(),
        manifiesto.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(firma_esperada, firma_recibida)
