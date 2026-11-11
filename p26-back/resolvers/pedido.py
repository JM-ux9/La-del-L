import eventos
import strawberry
from typing import Annotated, List, Optional, TYPE_CHECKING
from auth import requerir_usuario, requerir_admin
from brevo_service import enviar_correo_status_pedido, crear_html_pedido_changed_status

if TYPE_CHECKING:
    from resolvers.producto import Producto
    from resolvers.usuario import Usuario

@strawberry.type
class DetallePedido:
    id: int
    pedido_id: strawberry.Private[int]
    producto_id: strawberry.Private[int]
    cantidad: int
    importe: float

    @strawberry.field
    async def producto(
        self, info: strawberry.Info
    ) -> Annotated["Producto", strawberry.lazy("resolvers.producto")]:
        from resolvers.producto import Producto
        
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM producto WHERE id = $1", self.producto_id)
            return Producto(**dict(row)) if row else None
        
@strawberry.type
class Pedido:
    id: int
    fecha: str
    total: float
    status: str
    usuario_id: strawberry.Private[int]
    fecha_entrega: Optional[str] = None

    @strawberry.field
    async def usuario(
        self, info: strawberry.Info
    ) -> Annotated["Usuario", strawberry.lazy("resolvers.usuario")]:
        from resolvers.usuario import Usuario

        pool = info.context["pool"]
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM usuario WHERE id = $1", self.usuario_id)
            return Usuario(**dict(row)) if row else None

    @strawberry.field
    async def detalles(self, info: strawberry.Info) -> List[DetallePedido]:
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM detalle_pedido WHERE pedido_id = $1", self.id)
            return [DetallePedido(**dict(r)) for r in rows]

@strawberry.input
class RenglonInput:
    producto_id: int
    cantidad: int

@strawberry.input
class PedidoInput:
    renglones: List[RenglonInput]
    # usuario_id: int

async def pedidos_by_cliente(info: strawberry.Info, id: int) -> List[Pedido]:
    pool = info.context["pool"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, "
            "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
            "total, status, usuario_id, "
            "to_char(fecha_entrega AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha_entrega "
            "FROM pedido WHERE usuario_id = $1 "
            "ORDER BY id DESC",
            id,
        )
        return [Pedido (**dict(r)) for r in rows]

async def update_pedido(info: strawberry.Info, id: int, new_stat: str) -> bool:
    pool = info.context["pool"]
    async with pool.acquire() as conn:
        usuario_id = await conn.fetchval(
            f"UPDATE pedido SET status = $1{", fecha_entrega = NULL" if new_stat == "CANCELADO" else ""} WHERE id = $2 RETURNING usuario_id",
            new_stat,
            id,
        )

    if usuario_id is not None:
        eventos.publicar(eventos.canal_usuario(usuario_id), id)
        eventos.publicar(eventos.canal_pedido(id), id)
        eventos.publicar(eventos.CANAL_PEDIDOS, id)

    return True

async def get_email_order_info(info: strawberry.Info, id: int):
    pool = info.context["pool"]
    async with pool.acquire() as conn:
        pedido_data = await conn.fetch(
            """
            SELECT
                ped.id AS id,
                ped.total,
                ped.usuario_id,
                ped.status,
                to_char(ped.fecha_entrega AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha_entrega,
                dp.id AS detalle_id,
                dp.cantidad,
                dp.importe,
                prod.id AS producto_id,
                prod.nombre AS producto_nombre,
                usr.nombre AS usuario_nombre,
                usr.email AS usuario_email
            FROM pedido AS ped
            INNER JOIN detalle_pedido AS dp
                ON dp.pedido_id = ped.id
            INNER JOIN producto AS prod
                ON prod.id = dp.producto_id
            INNER JOIN usuario AS usr
                ON usr.id = ped.usuario_id
            WHERE ped.id = $1;
            """,
            id,
        )
        return pedido_data

@strawberry.type
class PedidoQueries:
    @strawberry.field
    async def pedidos_pagados(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id, "
                "to_char(fecha_entrega AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha_entrega "
                "FROM pedido WHERE status = 'PAGADO' "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]

    @strawberry.field
    async def pedidos_listos(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id "
                "FROM pedido WHERE status = 'LISTO' "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]
        
    @strawberry.field
    async def pedidos_entregados(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id "
                "FROM pedido WHERE status = 'ENTREGADO' "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]

    @strawberry.field
    async def pedidos_rechazados(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id "
                "FROM pedido WHERE status = 'RECHAZADO' "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]

    @strawberry.field
    async def pedidos_cancelados(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id "
                "FROM pedido WHERE status = 'CANCELADO' "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]
        
    @strawberry.field
    async def pedidos_en_proceso(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id, "
                "to_char(fecha_entrega AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha_entrega "
                "FROM pedido WHERE status = 'EN PROCESO' "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]

    @strawberry.field
    async def pedidos(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, "
                "to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
                "total, status, usuario_id "
                "FROM pedido "
                "ORDER BY id DESC LIMIT $1 OFFSET $2",
                limite or 10, desde or 0,
            )
            return [Pedido (**dict(r)) for r in rows]

    @strawberry.field
    async def mis_pedidos(self, info: strawberry.Info) -> List[Pedido]:
        pool = info.context["pool"]
        usuario = requerir_usuario(info)
        return await pedidos_by_cliente(info, usuario["usuario_id"])

    @strawberry.field
    async def pedidos_by_cliente_id(self, info: strawberry.Info, id: int) -> List[Pedido]:
        pool = info.context["pool"]
        requerir_admin(info)
        return await pedidos_by_cliente(info, id)


@strawberry.type
class PedidoMutations:
    @strawberry.mutation
    async def set_in_progress(self, info: strawberry.Info, id: int, minutos: int) -> bool:
        requerir_admin(info)
        pool = info.context["pool"]
        status_update = await update_pedido(info, id, "EN PROCESO")
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE pedido SET fecha_entrega = NOW() + ($1 * INTERVAL '1 minute') WHERE id = $2", minutos, id
            )
        dict_data = await get_email_order_info(info, id)
        root_values = dict_data[0] if dict_data else None
        await enviar_correo_status_pedido(root_values["usuario_email"], root_values["usuario_nombre"], crear_html_pedido_changed_status(dict_data), "EN PROCESO")
        return status_update

    @strawberry.mutation
    async def set_ready(self, info: strawberry.Info, id: int) -> bool:
        requerir_admin(info)
        pool = info.context["pool"]
        status_update = await update_pedido(info, id, "LISTO")
        dict_data = await get_email_order_info(info, id)
        root_values = dict_data[0] if dict_data else None
        await enviar_correo_status_pedido(root_values["usuario_email"], root_values["usuario_nombre"], crear_html_pedido_changed_status(dict_data), "LISTO")
        return status_update

    @strawberry.mutation
    async def set_delivered(self, info: strawberry.Info, id: int) -> bool:
        requerir_admin(info)
        pool = info.context["pool"]
        status_update = await update_pedido(info, id, "ENTREGADO")
        dict_data = await get_email_order_info(info, id)
        root_values = dict_data[0] if dict_data else None
        await enviar_correo_status_pedido(root_values["usuario_email"], root_values["usuario_nombre"], crear_html_pedido_changed_status(dict_data), "ENTREGADO")
        return status_update

    @strawberry.mutation
    async def set_canceled(self, info: strawberry.Info, id: int) -> bool:
        requerir_admin(info)
        pool = info.context["pool"]
        status_update = await update_pedido(info, id, "CANCELADO")
        dict_data = await get_email_order_info(info, id)
        root_values = dict_data[0] if dict_data else None
        await enviar_correo_status_pedido(root_values["usuario_email"], root_values["usuario_nombre"], crear_html_pedido_changed_status(dict_data), "CANCELADO")
        return status_update

    @strawberry.mutation
    async def crear_pedido(self, info: strawberry.Info, datos: PedidoInput) -> Pedido:
        pool = info.context["pool"]
        usuario = requerir_usuario(info)

        if not datos.renglones:
            raise Exception("El pedido debe tener al menos un producto")

        for renglon in datos.renglones:
            if renglon.cantidad <= 0:
                raise Exception("Las cantidades deben ser mayores que cero")

        async with pool.acquire() as conn:
            async with conn.transaction():
                producto_ids = list({r.producto_id for r in datos.renglones})
                productos_rows = await conn.fetch(
                    "SELECT id, nombre, precio, disponible FROM producto WHERE id = ANY($1::int[])", producto_ids
                )
                productos = {row["id"]: row for row in productos_rows}

                faltantes = [pid for pid in producto_ids if pid not in productos]
                if faltantes:
                    raise Exception(f"Producto inexistente: {', '.join(str(p) for p in faltantes)}")

                agotados = [p["nombre"] for p in productos.values() if not p["disponible"]]
                if agotados:
                    raise Exception(f"Producto agotado: {', '.join(agotados)}")

                precios = {row["id"]: row["precio"] for row in productos_rows}

                total = sum(precios[r.producto_id] * r.cantidad for r in datos.renglones)

                pedido_row = await conn.fetchrow(
                    "INSERT INTO pedido (fecha, total, status, usuario_id) VALUES (now(), $1, $2, $3) RETURNING id, to_char(fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, total, status, usuario_id",
                    total, "PENDIENTE", usuario["usuario_id"]
                )

                for r in datos.renglones:
                    importe = precios[r.producto_id] * r.cantidad
                    await conn.execute(
                        "INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, importe) VALUES ($1, $2, $3, $4)",
                        pedido_row["id"], r.producto_id, r.cantidad, importe
                    )

        nuevo_pedido_id = pedido_row["id"]
        eventos.publicar(eventos.canal_usuario(usuario["usuario_id"]), nuevo_pedido_id)
        eventos.publicar(eventos.canal_pedido(nuevo_pedido_id), nuevo_pedido_id)
        eventos.publicar(eventos.CANAL_PEDIDOS, nuevo_pedido_id)

        return Pedido(**dict(pedido_row))