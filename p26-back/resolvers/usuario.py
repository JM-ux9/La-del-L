import strawberry
from typing import Optional
from enum import Enum
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError
from jwt_service import generar_access_token, generar_refresh_token, decodificar_token
import asyncpg
from datetime import datetime, timedelta, timezone

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
    access_token: str
    refresh_token: str
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
class RefreshPayload:
    access_token: str
    refresh_token: str


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
            try:
                row = await conn.fetchrow("INSERT INTO usuario (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *", datos.nombre, normalized_email, password, "CLIENTE")
            except asyncpg.UniqueViolationError:
                raise Exception("Este correo ya se encuentra registrado")
            
            return Usuario(**{**dict(row), "rol": RolEnum(row["rol"])}) if row else None

    @strawberry.mutation
    async def login(self, info: strawberry.Info, datos: LoginInput) -> AuthPayload:
        pool = info.context["pool"]

        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM usuario WHERE email = $1", datos.email)
            if row is None or not pwd_context.verify(datos.password, row["password"]):
                    raise Exception("Credenciales inválidas")
            access_token = generar_access_token({"usuario_id": row["id"], "email": row["email"], "rol": row["rol"]})
            refresh_token, jti = generar_refresh_token({"usuario_id": row["id"], "email": row["email"], "rol": row["rol"]})

            expires = datetime.now(timezone.utc) + timedelta(days=7)
            await conn.execute(
                "INSERT INTO refresh_tokens (usuario_id, jti, expires_at) VALUES ($1, $2, $3)",
                row["id"], jti, expires
            )
            return AuthPayload(access_token=access_token, refresh_token=refresh_token, usuario=Usuario(**{**dict(row), "rol": RolEnum(row["rol"])}))

    @strawberry.mutation
    async def refrescar_token(self, info: strawberry.Info, refresh_token: str) -> RefreshPayload:
        pool = info.context["pool"]
        
        payload = decodificar_token(refresh_token)
        if payload is None or payload.get("tipo") != "refresh":
            raise Exception("Refresh Token Inválido")

        jti = payload["jti"]
        usuario_id = payload["usuario_id"]

        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM refresh_tokens WHERE jti = $1", jti)

            if row is None:
                raise Exception("Refresh Token Inválido")

            if row["usado"]:
                await conn.execute(
                    "UPDATE refresh_tokens SET usado = TRUE WHERE usuario_id = $1",
                    usuario_id 
                )
                raise Exception("Refresh Token ya utilizado - Session Terminated")

            await conn.execute("UPDATE refresh_tokens SET usado = TRUE WHERE jti = $1", jti)

            usuario_row = await conn.fetchrow("SELECT * FROM usuario WHERE id = $1", usuario_id)

            nuevo_access = generar_access_token({
            "usuario_id": usuario_row["id"],
            "email": usuario_row["email"],
            "rol": usuario_row["rol"],
            })

            nuevo_refresh, nuevo_jti = generar_refresh_token({
                "usuario_id": usuario_row["id"],
                "email": usuario_row["email"],
                "rol": usuario_row["rol"],
            })

            expires = datetime.now(timezone.utc) + timedelta(days=7)
            await conn.execute(
                "INSERT INTO refresh_tokens (usuario_id, jti, expires_at) VALUES ($1, $2, $3)",
                usuario_id, nuevo_jti, expires
            )

        return RefreshPayload(access_token=nuevo_access, refresh_token=nuevo_refresh)

    @strawberry.mutation
    async def logout(self, info: strawberry.Info, refresh_token: str) -> bool:
        pool = info.context["pool"]
        
        payload = decodificar_token(refresh_token)
        if payload is None or payload.get("tipo") != "refresh":
            raise Exception("Refresh Token Inválido")

        jti = payload["jti"]

        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM refresh_tokens WHERE jti = $1", jti)

            if row is None:
                raise Exception("Refresh Token Inválido")

            await conn.execute("UPDATE refresh_tokens SET usado = TRUE WHERE jti = $1", jti)

        return True