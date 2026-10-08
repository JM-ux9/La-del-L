from contextlib import asynccontextmanager
import hashlib
import logging
from decimal import Decimal
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from strawberry.fastapi import GraphQLRouter
from db import create_pool
from schema import schema
from fastapi.middleware.cors import CORSMiddleware
from jwt_service import decodificar_token
from mercadopago_service import crear_pago

logger = logging.getLogger(__name__)


class Identificacion(BaseModel):
    type: str
    number: str


class DatosPagador(BaseModel):
    email: str
    identification: Identificacion


class DatosPago(BaseModel):
    pedido_id: int = Field(gt=0)
    token: str = Field(min_length=1)
    payment_method_id: str = Field(min_length=1)
    installments: int = Field(ge=1)
    payer: DatosPagador

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

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")


@app.post("/payments")
async def procesar_pago(datos: DatosPago, request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ") if auth_header.startswith("Bearer ") else None
    usuario = decodificar_token(token) if token else None
    if not usuario or usuario.get("tipo") != "access":
        raise HTTPException(status_code=401, detail="Sesión no válida. Inicia sesión de nuevo.")

    pool = request.app.state.pool
    async with pool.acquire() as conn:
        pedido = await conn.fetchrow(
            "SELECT id, total, status FROM pedido WHERE id = $1 AND usuario_id = $2",
            datos.pedido_id,
            usuario["usuario_id"],
        )
    if not pedido:
        raise HTTPException(status_code=404, detail="No se encontró el pedido.")
    if pedido["status"] == "PAGADO":
        raise HTTPException(status_code=409, detail="Este pedido ya fue pagado.")
    if pedido["status"] == "EN_PROCESO":
        raise HTTPException(status_code=409, detail="El pago de este pedido ya está en proceso.")

    async with pool.acquire() as conn:
        pedido_en_proceso = await conn.fetchrow(
            """
            UPDATE pedido SET status = 'EN_PROCESO'
            WHERE id = $1 AND usuario_id = $2 AND status IN ('PENDIENTE', 'RECHAZADO')
            RETURNING id
            """,
            pedido["id"],
            usuario["usuario_id"],
        )
    if not pedido_en_proceso:
        raise HTTPException(status_code=409, detail="El estado del pedido no permite iniciar otro pago.")

    total = Decimal(str(pedido["total"])).quantize(Decimal("0.01"))
    try:
        pago = crear_pago({
            "transaction_amount": float(total),
            "token": datos.token,
            "description": f"Pedido Café del L #{pedido['id']}",
            "installments": datos.installments,
            "payment_method_id": datos.payment_method_id,
            "payer": {
                "email": datos.payer.email,
                "identification": datos.payer.identification.model_dump(),
            },
            "external_reference": str(pedido["id"]),
        }, hashlib.sha256(f"{pedido['id']}:{datos.token}".encode()).hexdigest())
    except Exception as exc:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE pedido SET status = 'PENDIENTE' WHERE id = $1 AND status = 'EN_PROCESO'",
                pedido["id"],
            )
        logger.exception("No se pudo crear el pago de Mercado Pago para el pedido %s", pedido["id"])
        raise HTTPException(status_code=502, detail="No se pudo procesar el pago. Inténtalo de nuevo.") from exc

    estados_pedido = {
        "approved": "PAGADO",
        "pending": "EN_PROCESO",
        "in_process": "EN_PROCESO",
        "rejected": "RECHAZADO",
        "cancelled": "CANCELADO",
        "refunded": "REEMBOLSADO",
        "charged_back": "CONTRACARGO",
        "in_mediation": "EN_REVISION",
    }
    estado_pago = pago["status"]
    estado_pedido = estados_pedido.get(estado_pago)
    if not estado_pedido:
        logger.error(
            "Mercado Pago devolvió un estado desconocido (%s) para el pedido %s",
            estado_pago,
            pedido["id"],
        )
        raise HTTPException(status_code=502, detail="No se pudo determinar el estado del pago.")

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE pedido SET status = $1 WHERE id = $2 AND usuario_id = $3",
            estado_pedido,
            pedido["id"],
            usuario["usuario_id"],
        )

    return {
        "id": pago["id"],
        "status": estado_pago,
        "status_detail": pago.get("status_detail"),
    }