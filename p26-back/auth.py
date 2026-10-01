import strawberry

def requerir_usuario(info: strawberry.Info):
    usuario = info.context.get("usuario")
    if usuario is None:
        if info.context.get("token_expirado"):
            raise Exception("TOKEN_EXPIRADO")
        raise Exception("No autenticado")
    return usuario

def requerir_admin(info: strawberry.Info):
    usuario = requerir_usuario(info)
    if usuario["rol"] != "ADMIN":
        raise Exception("No autorizado")
    return usuario