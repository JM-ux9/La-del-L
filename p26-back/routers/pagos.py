import logging
import os
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal

import mercadopago
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.concurrency import run_in_threadpool

from jwt_service import usuario_desde_header
from mercadopago_service import crear_orden, obtener_orden, validar_firma_webhook

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1")

webhook_secret = os.getenv("MERCADOPAGO_WEBHOOK_SECRET")
_access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
sdk = mercadopago.SDK(_access_token) if _access_token else None

# ---------------------------------------------------------------- mensajes

RECHAZADOS = {"failed", "canceled"}
ESTADO_LOCAL = {"processed": "PAGADO", "failed": "RECHAZADO", "canceled": "RECHAZADO"}

MENSAJE_RECHAZO = "Mercado Pago rechazó el pago. Verifica los datos o intenta con otra tarjeta."
MENSAJE_ERROR = "No pudimos procesar tu pago en este momento. Inténtalo de nuevo o usa otro medio de pago."

MENSAJES_RECHAZO = {
    # Datos mal capturados
    "bad_filled_card_data": "Revisa los datos de tu tarjeta (número, vencimiento y código de seguridad) e inténtalo de nuevo.",
    "invalid_card_token": "No pudimos validar tu tarjeta. Vuelve a ingresar los datos e inténtalo de nuevo.",
    # Rechazos del banco emisor
    "insufficient_amount": "La tarjeta no tiene fondos suficientes para completar el pago.",
    "amount_limit_exceeded": "El monto excede el límite permitido de tu tarjeta. Intenta con otra tarjeta.",
    "required_call_for_authorize": "Tu banco requiere que autorices este pago. Comunícate con él e inténtalo de nuevo.",
    "card_disabled": "La tarjeta está deshabilitada. Comunícate con tu banco o intenta con otra tarjeta.",
    "invalid_installments": "La cantidad de mensualidades no es válida para esta tarjeta. Selecciona otra opción.",
    "max_attempts_exceeded": "Se alcanzó el límite de intentos para esta tarjeta. Intenta más tarde o con otra tarjeta.",
    "cc_rejected_duplicated_payment": "Este pago ya fue enviado. Revisa tus pedidos antes de volver a intentarlo.",
    "rejected_by_issuer": "Tu banco rechazó el pago. Comunícate con él o intenta con otra tarjeta.",
    "cc_rejected_other_reason": "Tu banco no aprobó el pago. Comunícate con él o intenta con otra tarjeta.",
    "processing_error": "Ocurrió un error al procesar el pago. Inténtalo de nuevo en unos minutos.",
    # Riesgo: genéricos a propósito
    "high_risk": "El pago no pudo aprobarse por motivos de seguridad. Intenta con otro medio de pago.",
    "in_review": "No pudimos confirmar el pago. Intenta con otro medio de pago.",
}

MENSAJES_ERROR_API = {
    "idempotency_key_already_used": "Este intento de pago ya fue enviado. Vuelve a intentarlo.",
    "resource_locked": "Tu pago ya se está procesando. Espera unos segundos.",
    "internal_error": "Mercado Pago tuvo un problema temporal. Inténtalo de nuevo en unos minutos.",
}

# ------------------------------------------------------------------ modelos


class _Modelo(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IdentificacionPago(_Modelo):
    type: str = Field(min_length=1)
    number: str = Field(min_length=1)


class PagadorPago(_Modelo):
    email: EmailStr
    identification: IdentificacionPago | None = None


class CrearOrdenRequest(_Modelo):
    pedido_id: int = Field(gt=0)
    token: str = Field(min_length=32, max_length=33)
    payment_method_id: str = Field(min_length=1)
    payment_method_type: Literal["credit_card", "debit_card"]
    installments: int = Field(gt=0, le=36)
    payer: PagadorPago


# ------------------------------------------------------------- dependencias


def usuario_actual(authorization: Annotated[str | None, Header()] = None) -> dict:
    usuario, expirado = usuario_desde_header(authorization)
    if usuario is None:
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRADO" if expirado else "No autenticado")
    return usuario


def sdk_configurado():
    if sdk is None:
        raise HTTPException(
            status_code=503,
            detail="El servicio de pagos no está configurado (MERCADOPAGO_ACCESS_TOKEN)",
        )
    return sdk


# ----------------------------------------------------------------- helpers


def _a_decimal(valor) -> Decimal:
    try:
        return Decimal(str(valor)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Importe inválido")


def _interpretar(resultado: dict) -> tuple[int, dict, str | None]:
    """Normaliza la respuesta de Mercado Pago a (http, orden, código de error).

    - Éxito: la order viene en `response`.
    - Rechazo (402): `response` trae `errors` y la order completa dentro de `data`.
    - Error de API (400, 409, 423...): `response` trae solo `errors`.
    """
    http = resultado.get("status")
    http = http if isinstance(http, int) else 500
    cuerpo = resultado.get("response")
    if not isinstance(cuerpo, dict):
        cuerpo = resultado
    orden = cuerpo.get("data") if isinstance(cuerpo.get("data"), dict) else cuerpo
    errores = cuerpo.get("errors")
    primero = errores[0] if isinstance(errores, list) and errores else {}
    codigo = primero.get("code") if isinstance(primero, dict) else None
    return http, orden, codigo


def _detalle_rechazo(orden: dict) -> str | None:
    transacciones = orden.get("transactions")
    pagos = transacciones.get("payments") if isinstance(transacciones, dict) else None
    return next(
        (
            pago["status_detail"]
            for pago in pagos or []
            if isinstance(pago, dict)
            and pago.get("status") in RECHAZADOS
            and pago.get("status_detail")
        ),
        None,
    )


async def _marcar_pedido(pool, pedido_id: int, estado: str) -> None:
    # Un pedido ya PAGADO nunca se degrada.
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE pedido SET status = $1 WHERE id = $2 AND status <> 'PAGADO'",
            estado,
            pedido_id,
        )


# --------------------------------------------------------------- endpoints


@router.post("/orders")
async def crear_orden_endpoint(
    datos: CrearOrdenRequest,
    request: Request,
    idempotency_key: Annotated[str, Header(alias="X-Idempotency-Key", min_length=1, max_length=128)],
    usuario: dict = Depends(usuario_actual),
    mp=Depends(sdk_configurado),
):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        pedido = await conn.fetchrow(
            "SELECT id, total, usuario_id, status FROM pedido WHERE id = $1",
            datos.pedido_id,
        )
    if pedido is None or pedido["usuario_id"] != usuario["usuario_id"]:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido["status"] == "PAGADO":
        raise HTTPException(status_code=409, detail="El pedido ya fue pagado")

    importe = f"{_a_decimal(pedido['total']):f}"
    datos_orden = {
        "type": "online",
        "processing_mode": "automatic",
        "capture_mode": "automatic",
        "total_amount": importe,
        "external_reference": str(pedido["id"]),
        "payer": {"email": str(datos.payer.email)},
        "transactions": {
            "payments": [
                {
                    "amount": importe,
                    "payment_method": {
                        "id": datos.payment_method_id,
                        "type": datos.payment_method_type,
                        "token": datos.token,
                        "installments": datos.installments,
                    },
                }
            ]
        },
    }
    if datos.payer.identification:
        datos_orden["payer"]["identification"] = datos.payer.identification.model_dump()

    try:
        resultado = await run_in_threadpool(crear_orden, mp, datos_orden, idempotency_key)
    except (requests.RequestException, ValueError, TypeError):
        logger.exception("No se pudo crear la orden de MercadoPago para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="No se pudo comunicar con MercadoPago para procesar la orden")
    if not isinstance(resultado, dict):
        logger.error("MercadoPago devolvió una respuesta inválida para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="Respuesta inválida de MercadoPago")

    http, orden, codigo_error = _interpretar(resultado)
    detalle = _detalle_rechazo(orden)

    # Rechazo de pago: HTTP 402, order failed/canceled o un pago con status_detail de rechazo.
    if detalle or http == 402 or orden.get("status") in RECHAZADOS:
        await _marcar_pedido(pool, pedido["id"], "RECHAZADO")
        raise HTTPException(
            status_code=402,
            detail={
                "code": detalle or codigo_error,
                "message": MENSAJES_RECHAZO.get(detalle, MENSAJE_RECHAZO),
            },
        )

    # Error de la API (400, 409, 423, 5xx) o respuesta incompleta.
    if not 200 <= http < 300 or not orden.get("id") or not orden.get("status"):
        logger.warning(
            "MercadoPago respondió HTTP %s (código %s) para el pedido %s",
            http, codigo_error, pedido["id"],
        )
        raise HTTPException(
            status_code=502,
            detail={"code": codigo_error, "message": MENSAJES_ERROR_API.get(codigo_error, MENSAJE_ERROR)},
        )

    if orden["status"] == "processed":
        await _marcar_pedido(pool, pedido["id"], "PAGADO")

    return {
        "id": orden["id"],
        "pedido_id": pedido["id"],
        "status": orden["status"],
        "status_detail": orden.get("status_detail"),
        "total_amount": orden.get("total_amount", importe),
        "url": orden.get("url"),
    }


@router.post("/mercadopago/webhook")
async def recibir_webhook_mercadopago(request: Request, mp=Depends(sdk_configurado)):
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="El webhook no está configurado (MERCADOPAGO_WEBHOOK_SECRET)")
    if request.query_params.get("type") != "order":
        return {"received": True}

    order_id = request.query_params.get("data.id")
    if not order_id or not validar_firma_webhook(
        webhook_secret,
        request.headers.get("x-signature"),
        request.headers.get("x-request-id"),
        order_id,
    ):
        raise HTTPException(status_code=401, detail="Firma de webhook inválida")

    try:
        resultado = await run_in_threadpool(obtener_orden, mp, order_id)
    except (requests.RequestException, ValueError, TypeError):
        logger.exception("No se pudo consultar la orden de MercadoPago %s", order_id)
        raise HTTPException(status_code=502, detail="No se pudo consultar la orden de MercadoPago")

    http, orden, _ = _interpretar(resultado) if isinstance(resultado, dict) else (500, {}, None)
    if not 200 <= http < 300 or not orden.get("id"):
        logger.error("MercadoPago devolvió una respuesta inválida para la orden %s", order_id)
        raise HTTPException(status_code=502, detail="Respuesta inválida de MercadoPago")

    referencia = orden.get("external_reference")
    if not isinstance(referencia, str) or not referencia.isdecimal():
        logger.warning("La orden %s no tiene una referencia de pedido válida", order_id)
        raise HTTPException(status_code=400, detail="Referencia de pedido inválida")

    estado = ESTADO_LOCAL.get(orden.get("status"))
    if estado is None:  # estado intermedio (processing, action_required...): no se toca el pedido
        return {"received": True}

    pool = request.app.state.pool
    async with pool.acquire() as conn:
        pedido = await conn.fetchrow("SELECT total FROM pedido WHERE id = $1", int(referencia))
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido asociado a la orden no encontrado")
    if estado == "PAGADO" and _a_decimal(orden.get("total_amount")) != _a_decimal(pedido["total"]):
        logger.error("El importe de la orden %s no coincide con el pedido %s", order_id, referencia)
        raise HTTPException(status_code=400, detail="Importe de orden no coincide")

    await _marcar_pedido(pool, int(referencia), estado)
    return {"received": True}


@router.get("/orders/{pedido_id}/status")
async def obtener_estado_orden(
    pedido_id: int,
    request: Request,
    usuario: dict = Depends(usuario_actual),
):
    async with request.app.state.pool.acquire() as conn:
        pedido = await conn.fetchrow(
            "SELECT id, status FROM pedido WHERE id = $1 AND usuario_id = $2",
            pedido_id,
            usuario["usuario_id"],
        )
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"pedido_id": pedido["id"], "status": pedido["status"]}
