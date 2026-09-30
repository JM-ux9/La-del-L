import strawberry
from typing import Optional
from enum import Enum
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError
from jwt_service import generar_token

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

class RolEnum(Enum):
    ADMIN = "ADMIN"
    CLIENTE = "CLIENTE"

Rol = strawberry.enum(RolEnum)

@strawberry.type
class Usuario:
    id: int
    nombre: str
    email: str
    password: strawberry.Private[str]
    rol: Rol

@strawberry.type
class AuthPayload:
    token: str
    usuario: Usuario

@strawberry.input
class UsuarioInput:
    nombre: str
    email: str
    password: str

@strawberry.input
class LoginInput:
    email: str
    password: str


@strawberry.type
class UsuarioMutations:
    @strawberry.mutation
    async def crear_usuario(self, info: strawberry.Info, datos: UsuarioInput) -> Optional[Usuario]:
        pool = info.context["pool"]

        try:
            email_info = validate_email(datos.email, check_deliverability=True)
            normalized_email = email_info.normalized

        except EmailNotValidError as e:
            raise Exception(f"Correo inválido: {e}")

        password = pwd_context.hash(datos.password)

        async with pool.acquire() as conn:
            row = await conn.fetchrow("INSERT INTO usuario (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *", datos.nombre, normalized_email, password, "CLIENTE")
            return Usuario(**{**dict(row), "rol": RolEnum(row["rol"])}) if row else None

    @strawberry.mutation
    async def login(self, info: strawberry.Info, datos: LoginInput) -> AuthPayload:
        pool = info.context["pool"]

        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM usuario WHERE email = $1", datos.email)
            if row is None or not pwd_context.verify(datos.password, row["password"]):
                    raise Exception("Credenciales inválidas")
            else:
                token = generar_token({"usuario_id": row["id"], "email": row["email"], "rol": row["rol"]})

            return AuthPayload(token=token, usuario=Usuario(**{**dict(row), "rol": RolEnum(row["rol"])}))
