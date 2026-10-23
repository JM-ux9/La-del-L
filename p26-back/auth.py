import strawberry

from jwt_service import usuario_desde_header


def _usuario_del_contexto(info: strawberry.Info):
    ctx = info.context
    usuario = ctx.get("usuario")
    expirado = ctx.get("token_expirado", False)

    if usuario is None and ctx.get("ws") is not None:
        params = ctx.get("connection_params") or {}
        header = params.get("Authorization") or params.get("authorization")
        if header:
            usuario, expirado = usuario_desde_header(header)
            # Se guarda para no volver a decodificar el token en la misma conexion
            ctx["usuario"] = usuario
            ctx["token_expirado"] = expirado

    return usuario, expirado


def requerir_usuario(info: strawberry.Info):
    usuario, expirado = _usuario_del_contexto(info)
    if usuario is None:
        if expirado:
            raise Exception("TOKEN_EXPIRADO")
        raise Exception("No autenticado")
    return usuario


def requerir_admin(info: strawberry.Info):
    usuario = requerir_usuario(info)
    if usuario["rol"] != "ADMIN":
        raise Exception("No autorizado")
    return usuario