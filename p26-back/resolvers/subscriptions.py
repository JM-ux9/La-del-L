from typing import AsyncGenerator
import strawberry
import eventos
from auth import requerir_admin
from resolvers.pedido import Pedido


@strawberry.type
class PedidoSubscriptions:
    @strawberry.subscription
    async def pedidos_en_vivo(self, info: strawberry.Info) -> AsyncGenerator[Pedido, None]:
        """Emite cualquier pedido nuevo o actualizado en tiempo real para el backoffice."""
        requerir_admin(info)
        pool = info.context["pool"]

        async with eventos.suscribir(eventos.CANAL_PEDIDOS) as cola:
            while True:
                pedido_id = await cola.get()
                async with pool.acquire() as conn:
                    fila = await conn.fetchrow(
                        "SELECT id, "
                        "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                        "total, status, usuario_id "
                        "FROM pedido WHERE id = $1",
                        pedido_id,
                    )
                if fila:
                    yield Pedido(**dict(fila))
                    
    @strawberry.subscription
    async def pedido_actualizado(
        self, info: strawberry.Info, pedido_id: int
    ) -> AsyncGenerator[Pedido, None]:
        usuario = requerir_usuario(info)
        pool = info.context["pool"]

        async def leer_pedido():
            async with pool.acquire() as conn:
                return await conn.fetchrow("SELECT * FROM pedido WHERE id = $1", pedido_id)

        async with eventos.suscribir(eventos.canal_pedido(pedido_id)) as cola:
            fila = await leer_pedido()
            if fila is None or (
                fila["usuario_id"] != usuario["usuario_id"] and usuario["rol"] != "ADMIN"
            ):
                raise Exception("Pedido no encontrado")
            yield Pedido(**dict(fila))

            while True:
                await cola.get()
                fila = await leer_pedido()
                if fila is None:
                    return
                yield Pedido(**dict(fila))

    @strawberry.subscription
    async def nuevo_pedido_creado(self, info: strawberry.Info) -> AsyncGenerator[Pedido, None]:
        requerir_admin(info)
        async with eventos.suscribir(eventos.CANAL_PEDIDOS) as cola:
            while True:
                evento = await cola.get()
                if isinstance(evento, Pedido):
                    yield evento