from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from strawberry.subscriptions import (
    GRAPHQL_SSE_PROTOCOL,
    GRAPHQL_TRANSPORT_WS_PROTOCOL,
    GRAPHQL_WS_PROTOCOL,
)

from db import create_pool
from jwt_service import usuario_desde_header
from routers.pagos import router as pagos_router
from schema import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    yield
    await app.state.pool.close()


async def get_context(
    request: Request = None,
    ws: WebSocket = None,
):
    auth_header = None
    pool = None

    if request is not None:
        # Peticiones HTTP (Queries, Mutations y subscriptions por SSE)
        auth_header = request.headers.get("Authorization")
        pool = request.app.state.pool
    elif ws is not None:
        # WebSocket (subscriptions): aqui todavia NO llega el token.
        # Llega despues en el mensaje connection_init y Strawberry lo pone en
        # context["connection_params"]; auth.py lo lee de ahi al validar.
        pool = ws.app.state.pool

    usuario, token_expirado = usuario_desde_header(auth_header)

    return {
        "pool": pool,
        "usuario": usuario,
        "token_expirado": token_expirado,
        "request": request,
        "ws": ws,
    }


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4321",
        "https://la-del-l.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graphql_router = GraphQLRouter(
    schema,
    subscription_protocols=[
        GRAPHQL_TRANSPORT_WS_PROTOCOL,
        GRAPHQL_WS_PROTOCOL,
        GRAPHQL_SSE_PROTOCOL,
    ],
    context_getter=get_context,
)

app.include_router(pagos_router)
app.include_router(graphql_router, prefix="/graphql")