from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from strawberry.fastapi import GraphQLRouter
from db import create_pool
from schema import schema
from fastapi.middleware.cors import CORSMiddleware
from jwt_service import decodificar_token
import mercadopago
from pydantic import BaseModel, Field

class PreferenceItem(BaseModel):
    title: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)

class PreferenceRequest(BaseModel):
    items: list[PreferenceItem] = Field(min_length=1)


sdk = mercadopago.SDK("APP_USR-4936382929172759-101320-4ba74a5514ddf0742913f4356cf3156a-3748834214")

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

@app.post("/create-preference")
def create_preference(datos: PreferenceRequest):
    resultado = sdk.preference().create({
        "items": [
            {**item.model_dump(), "currency_id": "MXN"}
            for item in datos.items
        ]
    })

    preferencia = resultado.get("response", {})
    if not 200 <= resultado.get("status", 0) < 300 or not preferencia.get("id"):
        raise HTTPException(status_code=502, detail="No se pudo crear la preferencia.")

    return {"preference_id": preferencia["id"]}


graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")