import strawberry

def requerir_usuario(info: strawberry.Info):
    usuario = info.context.get("usuario")
    if usuario is None:
        raise Exception("No autenticado")
    return usuario

def requerir_admin(info: strawberry.Info):
    usuario = info.context.get("usuario")
    if usuario is None or usuario["rol"] != "ADMIN":
        raise Exception("No autorizado")
    # raise Exception(usuario["rol"])
    return usuario