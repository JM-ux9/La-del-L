import strawberry

def requerir_usuario(info: strawberry.Info):
    usuario = info.context.get("usuario")
    if usuario is None:
        raise Exception("No autenticado")
    return usuario