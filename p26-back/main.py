from contextlib import asynccontextmanager
import logging
import os
from typing import Annotated
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from strawberry.fastapi import GraphQLRouter
from db import create_pool
from schema import schema
from fastapi.middleware.cors import CORSMiddleware
from jwt_service import decodificar_token
from mercadopago_service import crear_pago
from starlette.concurrency import run_in_threadpool
import mercadopago
import requests

logger = logging.getLogger(__name__)

mercadopago_access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
sdk = mercadopago.SDK(mercadopago_access_token) if mercadopago_access_token else None


class IdentificacionPago(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1)
    number: str = Field(min_length=1)


class PagadorPago(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    identification: IdentificacionPago | None = None


class CrearPagoRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pedido_id: int = Field(gt=0)
    token: str = Field(min_length=1)
    payment_method_id: str = Field(min_length=1)
    installments: int = Field(gt=0)
    issuer_id: str = Field(min_length=1)
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


@app.post("/v1/payments")
async def crear_pago_endpoint(
    datos: CrearPagoRequest,
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

    datos_pago = {
        "transaction_amount": float(pedido["total"]),
        "token": datos.token,
        "payment_method_id": datos.payment_method_id,
        "installments": datos.installments,
        "issuer_id": datos.issuer_id,
        "external_reference": str(pedido["id"]),
        "payer": {"email": str(datos.payer.email)},
    }
    if datos.payer.identification:
        datos_pago["payer"]["identification"] = datos.payer.identification.model_dump()

    try:
        resultado = await run_in_threadpool(
            crear_pago,
            sdk,
            datos_pago,
            idempotency_key,
        )
    except (requests.RequestException, ValueError, TypeError):
        logger.exception("No se pudo crear el pago para el pedido %s", pedido["id"])
        raise HTTPException(
            status_code=502,
            detail="No se pudo comunicar con MercadoPago para procesar el pago",
        )

    if not isinstance(resultado, dict):
        logger.error("MercadoPago devolvió una respuesta inválida para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="Respuesta inválida de MercadoPago")

    codigo_respuesta = resultado.get("status", 500)
    pago = resultado.get("response")
    if not isinstance(codigo_respuesta, int) or not 200 <= codigo_respuesta < 300:
        logger.warning(
            "MercadoPago rechazó la solicitud para el pedido %s con estado HTTP %s",
            pedido["id"],
            codigo_respuesta,
        )
        detalle = pago.get("message") if isinstance(pago, dict) else None
        raise HTTPException(
            status_code=502,
            detail=detalle or "MercadoPago rechazó la solicitud de pago",
        )
    if not isinstance(pago, dict) or not pago.get("id") or not pago.get("status"):
        logger.error("MercadoPago devolvió datos de pago incompletos para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="Respuesta incompleta de MercadoPago")

    estado_pedido = {
        "approved": "PAGADO",
        "rejected": "RECHAZADO",
    }.get(pago["status"])
    if estado_pedido:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE pedido SET status = $1 WHERE id = $2",
                estado_pedido,
                pedido["id"],
            )

    return {
        "id": pago["id"],
        "pedido_id": pedido["id"],
        "status": pago["status"],
        "status_detail": pago.get("status_detail"),
        "transaction_amount": pago.get("transaction_amount", float(pedido["total"])),
        "payment_method_id": pago.get("payment_method_id"),
        "installments": pago.get("installments"),
    }


graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")
