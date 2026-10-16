from contextlib import asynccontextmanager
from decimal import Decimal
import logging
import os
from typing import Annotated, Literal
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from strawberry.fastapi import GraphQLRouter
from db import create_pool
from schema import schema
from fastapi.middleware.cors import CORSMiddleware
from jwt_service import decodificar_token
from mercadopago_service import crear_orden, obtener_orden, validar_firma_webhook
from starlette.concurrency import run_in_threadpool
import mercadopago
import requests

logger = logging.getLogger(__name__)

mercadopago_access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
sdk = mercadopago.SDK(mercadopago_access_token) if mercadopago_access_token else None
mercadopago_webhook_secret = os.getenv("MERCADOPAGO_WEBHOOK_SECRET")


class IdentificacionPago(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1)
    number: str = Field(min_length=1)


class PagadorPago(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    identification: IdentificacionPago | None = None


class CrearOrdenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pedido_id: int = Field(gt=0)
    token: str = Field(min_length=32, max_length=33)
    payment_method_id: str = Field(min_length=1)
    payment_method_type: Literal["credit_card", "debit_card"]
    installments: int = Field(gt=0, le=36)
    payer: PagadorPago

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    yield
    await app.state.pool.close()

async def get_context(request: Request):
    usuario = None
    token_expirado = False

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ")
        payload = decodificar_token(token)
        if payload is None:
            token_expirado = True
        elif payload.get("tipo") == "access":
            usuario = payload

    return {"pool": request.app.state.pool, "usuario": usuario, "token_expirado": token_expirado}


def usuario_desde_autorizacion(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")

    payload = decodificar_token(authorization.removeprefix("Bearer "))
    if payload is None:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    if payload.get("tipo") != "access" or not payload.get("usuario_id"):
        raise HTTPException(status_code=401, detail="Se requiere un token de acceso")

    return payload

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:4321",
    "https://la-del-l.netlify.app",
],
)

@app.get("/v1/payment_methods")
def get_payment_methods():
    if sdk is None:
        raise HTTPException(
            status_code=503,
            detail="El servicio de pagos no está configurado (MERCADOPAGO_ACCESS_TOKEN)",
        )
    payment_methods_response = sdk.payment_methods().list_all()
    payment_methods = payment_methods_response["response"]
    return payment_methods


@app.post("/v1/orders")
async def crear_orden_endpoint(
    datos: CrearOrdenRequest,
    request: Request,
    idempotency_key: Annotated[
        str,
        Header(alias="X-Idempotency-Key", min_length=1, max_length=128),
    ],
    authorization: Annotated[str | None, Header()] = None,
):
    usuario = usuario_desde_autorizacion(authorization)
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
    if sdk is None:
        raise HTTPException(
            status_code=503,
            detail="El servicio de pagos no está configurado (MERCADOPAGO_ACCESS_TOKEN)",
        )

    importe = format(Decimal(str(pedido["total"])).quantize(Decimal("0.01")), "f")
    metodo_pago = {
        "id": datos.payment_method_id,
        "type": datos.payment_method_type,
        "token": datos.token,
        "installments": datos.installments,
    }
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
                    "payment_method": metodo_pago,
                }
            ]
        },
    }
    if datos.payer.identification:
        datos_orden["payer"]["identification"] = datos.payer.identification.model_dump()

    try:
        resultado = await run_in_threadpool(
            crear_orden,
            sdk,
            datos_orden,
            idempotency_key,
        )
    except (requests.RequestException, ValueError, TypeError):
        logger.exception("No se pudo crear la orden de MercadoPago para el pedido %s", pedido["id"])
        raise HTTPException(
            status_code=502,
            detail="No se pudo comunicar con MercadoPago para procesar la orden",
        )

    if not isinstance(resultado, dict):
        logger.error("MercadoPago devolvió una respuesta inválida para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="Respuesta inválida de MercadoPago")

    codigo_respuesta = resultado.get("status", 500)
    orden = resultado.get("response")
    if not isinstance(codigo_respuesta, int) or not 200 <= codigo_respuesta < 300:
        logger.warning(
            "MercadoPago rechazó la orden para el pedido %s con estado HTTP %s",
            pedido["id"],
            codigo_respuesta,
        )
        detalle = orden.get("message") if isinstance(orden, dict) else None
        raise HTTPException(
            status_code=502,
            detail=detalle or "MercadoPago rechazó la solicitud de orden",
        )
    if not isinstance(orden, dict) or not orden.get("id") or not orden.get("status"):
        logger.error("MercadoPago devolvió datos de orden incompletos para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="Respuesta incompleta de MercadoPago")

    if orden["status"] == "processed":
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE pedido SET status = $1 WHERE id = $2",
                "PAGADO",
                pedido["id"],
            )
    elif orden["status"] == "canceled":
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE pedido SET status = $1 WHERE id = $2 AND status <> $3",
                "RECHAZADO",
                pedido["id"],
                "PAGADO",
            )

    return {
        "id": orden["id"],
        "pedido_id": pedido["id"],
        "status": orden["status"],
        "status_detail": orden.get("status_detail"),
        "total_amount": orden.get("total_amount", importe),
        "url": orden.get("url"),
    }


@app.post("/v1/mercadopago/webhook")
async def recibir_webhook_mercadopago(request: Request):
    if not mercadopago_webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="El webhook no está configurado (MERCADOPAGO_WEBHOOK_SECRET)",
        )
    if sdk is None:
        raise HTTPException(
            status_code=503,
            detail="El servicio de pagos no está configurado (MERCADOPAGO_ACCESS_TOKEN)",
        )

    tipo = request.query_params.get("type")
    order_id = request.query_params.get("data.id")
    if tipo != "order":
        return {"received": True}
    if not order_id or not validar_firma_webhook(
        mercadopago_webhook_secret,
        request.headers.get("x-signature"),
        request.headers.get("x-request-id"),
        order_id,
    ):
        raise HTTPException(status_code=401, detail="Firma de webhook inválida")

    try:
        resultado = await run_in_threadpool(obtener_orden, sdk, order_id)
    except (requests.RequestException, ValueError, TypeError):
        logger.exception("No se pudo consultar la orden de MercadoPago %s", order_id)
        raise HTTPException(status_code=502, detail="No se pudo consultar la orden de MercadoPago")

    if (
        not isinstance(resultado, dict)
        or not isinstance(resultado.get("status"), int)
        or not 200 <= resultado["status"] < 300
        or not isinstance(resultado.get("response"), dict)
    ):
        logger.error("MercadoPago devolvió una respuesta inválida para la orden %s", order_id)
        raise HTTPException(status_code=502, detail="Respuesta inválida de MercadoPago")

    orden = resultado["response"]
    referencia = orden.get("external_reference")
    if not referencia or not referencia.isdecimal():
        logger.warning("La orden %s no tiene una referencia de pedido válida", order_id)
        raise HTTPException(status_code=400, detail="Referencia de pedido inválida")

    estado_local = {
        "processed": "PAGADO",
        "canceled": "RECHAZADO",
    }.get(orden.get("status"))
    if estado_local:
        async with request.app.state.pool.acquire() as conn:
            pedido = await conn.fetchrow(
                "SELECT id, total FROM pedido WHERE id = $1",
                int(referencia),
            )
            if pedido is None:
                raise HTTPException(status_code=404, detail="Pedido asociado a la orden no encontrado")

            if estado_local == "PAGADO":
                total_pedido = Decimal(str(pedido["total"])).quantize(Decimal("0.01"))
                try:
                    total_orden = Decimal(str(orden["total_amount"])).quantize(Decimal("0.01"))
                except (KeyError, ArithmeticError, ValueError):
                    raise HTTPException(status_code=400, detail="Importe de orden inválido")
                if total_orden != total_pedido:
                    logger.error(
                        "El importe de la orden %s no coincide con el pedido %s",
                        order_id,
                        referencia,
                    )
                    raise HTTPException(status_code=400, detail="Importe de orden no coincide")

            actualizado = await conn.fetchrow(
                "UPDATE pedido SET status = "
                "CASE WHEN status = 'PAGADO' THEN status ELSE $1 END "
                "WHERE id = $2 "
                "RETURNING id",
                estado_local,
                int(referencia),
            )
        if actualizado is None:
            raise HTTPException(status_code=404, detail="Pedido asociado a la orden no encontrado")

    return {"received": True}


@app.get("/v1/orders/{pedido_id}/status")
async def obtener_estado_orden(
    pedido_id: int,
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
):
    usuario = usuario_desde_autorizacion(authorization)
    async with request.app.state.pool.acquire() as conn:
        pedido = await conn.fetchrow(
            "SELECT id, status FROM pedido WHERE id = $1 AND usuario_id = $2",
            pedido_id,
            usuario["usuario_id"],
        )
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"pedido_id": pedido["id"], "status": pedido["status"]}


graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")
