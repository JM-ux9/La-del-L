import strawberry
from typing import Optional, List
from enum import Enum
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError
from jwt_service import (
    generar_access_token,
    generar_refresh_token,
    decodificar_token,
    REFRESH_EXPIRACION_DIAS,
)
import asyncpg
from datetime import datetime, timedelta, timezone

from auth import requerir_admin, requerir_usuario

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

PASSWORD_MINIMO = 8

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
class UsuarioQueries:
    @strawberry.field
    async def listar_usuarios(self, info: strawberry.Info) -> List[Usuario]:
        pool = info.context["pool"]
        requerir_admin(info)

        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT id, nombre, email, rol FROM usuario;")

        return [Usuario(**(dict(r) | {"password": ""})) for r in rows]

    @strawberry.field
    async def user_by_id(self, info: strawberry.Info, id: int) -> Optional[Usuario]:
        pool = info.context["pool"]
        requerir_admin(info)

        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT id, nombre, email, rol FROM usuario WHERE id = $1;", id)

        return Usuario(**(dict(row) | {"password": ""})) if row else None

@strawberry.type
class UsuarioMutations:
    @strawberry.mutation
    async def crear_usuario(self, info: strawberry.Info, datos: UsuarioInput) -> Optional[Usuario]:
        pool = info.context["pool"]

        nombre = datos.nombre.strip()
        if not nombre:
            raise Exception("El nombre es obligatorio")

        password = datos.password
        if len(password) < PASSWORD_MINIMO:
            raise Exception(f"La contraseña debe tener al menos {PASSWORD_MINIMO} caracteres")

        try:
            email_info = validate_email(datos.email, check_deliverability=True)
            normalized_email = email_info.normalized

        except EmailNotValidError as e:
            raise Exception(f"Correo inválido: {e}")

        hashed = pwd_context.hash(password)

        async with pool.acquire() as conn:
            try:
                row = await conn.fetchrow("INSERT INTO usuario (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *", nombre, normalized_email, hashed, "CLIENTE")
            except asyncpg.UniqueViolationError:
                raise Exception("Este correo ya se encuentra registrado")
            
            return Usuario(**{**dict(row), "rol": RolEnum(row["rol"])}) if row else None

    @strawberry.mutation
    async def login(self, info: strawberry.Info, datos: LoginInput) -> AuthPayload:
        pool = info.context["pool"]

        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM usuario WHERE lower(email) = lower($1)", datos.email.strip())
            if row is None or not pwd_context.verify(datos.password, row["password"]):
                    raise Exception("Credenciales inválidas")
            access_token = generar_access_token({"usuario_id": row["id"], "email": row["email"], "rol": row["rol"]})
            refresh_token, jti = generar_refresh_token({"usuario_id": row["id"], "email": row["email"], "rol": row["rol"]})

            expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRACION_DIAS)
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

            if usuario_row is None:
                raise Exception("El usuario de este token ya no existe")

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

            expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRACION_DIAS)
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

    @strawberry.mutation
    async def update_usuario(self, info: strawberry.Info, name: str) -> bool:
        pool = info.context["pool"]
        usuario = requerir_usuario(info)

        async with pool.acquire() as conn:
            row = await conn.execute("UPDATE usuario SET nombre = $1 WHERE id = $2;", name, usuario["usuario_id"])

        return True

    @strawberry.mutation
    async def reset_password(self, info: strawberry.Info, pswd: str, new_pswd: str) -> bool:
        pool = info.context["pool"]

        try:
            usuario = requerir_usuario(info)

            async with pool.acquire() as conn:
                row = await conn.fetchrow("SELECT * FROM usuario WHERE email = $1", usuario["email"])
                if row is None or not pwd_context.verify(pswd, row["password"]):
                    raise Exception("Credenciales inválidas")
                    return False
                
                hashed = pwd_context.hash(new_pswd)
                row = await conn.execute("UPDATE usuario SET password = $1 WHERE id = $2", hashed, usuario["usuario_id"])
                
            return True
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def ascend_user(self, info: strawberry.Info, id: int) -> bool:
        pool = info.context["pool"]

        requerir_admin(info)
        
        async with pool.acquire() as conn:
            row = await conn.execute("UPDATE usuario SET rol = 'ADMIN' WHERE id = $1", id)

        return True

    @strawberry.mutation
    async def actualizar_nombre_usuario(self, info: strawberry.Info, id: int, nombre: str) -> bool:
        pool = info.context["pool"]
        requerir_admin(info)

        nombre = nombre.strip()
        if not nombre:
            raise Exception("El nombre es obligatorio")

        async with pool.acquire() as conn:
            row = await conn.execute("UPDATE usuario SET nombre = $1 WHERE id = $2;", nombre, id)

        return True

    @strawberry.mutation
    async def eliminar_usuario(self, info: strawberry.Info, id: int) -> bool:
        pool = info.context["pool"]
        requerir_admin(info)
        usuario = requerir_usuario(info)

        if usuario["usuario_id"] == id:
            raise Exception("No puedes eliminar tu propia cuenta")

        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM refresh_tokens WHERE usuario_id = $1", id)
            row = await conn.execute("DELETE FROM usuario WHERE id = $1", id)

        return True

    @strawberry.mutation
    async def descend_user(self, info: strawberry.Info, id: int) -> bool:
        pool = info.context["pool"]
        requerir_admin(info)
        usuario = requerir_usuario(info)

        if usuario["usuario_id"] == id:
            raise Exception("No puedes quitarte el rol de administrador")

        async with pool.acquire() as conn:
            row = await conn.execute("UPDATE usuario SET rol = 'CLIENTE' WHERE id = $1", id)

        return True