from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from db import create_pool
from jwt_service import usuario_desde_header
from routers.pagos import router as pagos_router
from schema import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    yield
    await app.state.pool.close()


async def get_context(request: Request):
    usuario, token_expirado = usuario_desde_header(request.headers.get("Authorization"))
    return {"pool": request.app.state.pool, "usuario": usuario, "token_expirado": token_expirado}


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

app.include_router(pagos_router)
app.include_router(GraphQLRouter(schema, context_getter=get_context), prefix="/graphql")