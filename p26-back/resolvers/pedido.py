import strawberry
from typing import Annotated, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from resolvers.producto import Producto

@strawberry.type
class Usuario:
    id: int
    nombre: str
    email: str
    password: str
    rol: str

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

    @strawberry.field
    async def usuario(self, info: strawberry.Info) -> Usuario:
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

@strawberry.type
class PedidoQueries:
    @strawberry.field
    async def pedidos(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Pedido]:
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM pedido ORDER BY id LIMIT $1 OFFSET $2", limite or 10, desde or 0)
            return [Pedido (**dict(r)) for r in rows]

@strawberry.type
class PedidoMutations:
    @strawberry.mutation
    async def crear_pedido(self, info: strawberry.Info, datos: PedidoInput) -> Pedido:
        pool = info.context["pool"]
        usuario_id = 1

        async with pool.acquire() as conn:
            async with conn.transaction():
                producto_ids = [r.producto_id for r in datos.renglones]
                productos_rows = await conn.fetch(
                    "SELECT id, precio FROM producto WHERE id = ANY($1::int[])", producto_ids
                )
                precios = {row["id"]: row["precio"] for row in productos_rows}

                total = sum(precios[r.producto_id] * r.cantidad for r in datos.renglones)

                pedido_row = await conn.fetchrow(
                    "INSERT INTO pedido (fecha, total, status, usuario_id) VALUES (now(), $1, $2, $3) RETURNING *",
                    total, "PENDIENTE", usuario_id
                )

                for r in datos.renglones:
                    importe = precios[r.producto_id] * r.cantidad
                    await conn.execute(
                        "INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, importe) VALUES ($1, $2, $3, $4)",
                        pedido_row["id"], r.producto_id, r.cantidad, importe
                    )

        return Pedido(**dict(pedido_row))
