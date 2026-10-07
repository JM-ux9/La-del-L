import strawberry
from typing import List, Optional
from auth import requerir_admin

@strawberry.type
class ProductoVendido:
    producto_id: int
    nombre: str
    cantidad_vendida: int
    total_vendido: float

@strawberry.type
class VentaDia:
    fecha: str
    total: float
    pedidos: int

@strawberry.type
class DashboardQueries:
    @strawberry.field
    async def productos_mas_vendidos(self, info: strawberry.Info, limite: Optional[int] = None) -> List[ProductoVendido]:
        requerir_admin(info)
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT p.id AS producto_id, p.nombre, "
                "SUM(d.cantidad) AS cantidad_vendida, "
                "SUM(d.importe)::float AS total_vendido "
                "FROM detalle_pedido d "
                "JOIN producto p ON p.id = d.producto_id "
                "GROUP BY p.id, p.nombre "
                "ORDER BY cantidad_vendida DESC "
                "LIMIT $1",
                limite or 5,
            )
            return [ProductoVendido(**dict(r)) for r in rows]

    @strawberry.field
    async def ventas_semana(self, info: strawberry.Info) -> List[VentaDia]:
        requerir_admin(info)
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT to_char(dias.dia, 'YYYY-MM-DD') AS fecha, "
                "COALESCE(SUM(p.total), 0)::float AS total, "
                "COUNT(p.id) AS pedidos "
                "FROM generate_series("
                "(now() AT TIME ZONE 'America/Mexico_City')::date - 6, "
                "(now() AT TIME ZONE 'America/Mexico_City')::date, "
                "interval '1 day') AS dias(dia) "
                "LEFT JOIN pedido p "
                "ON (p.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date = dias.dia::date "
                "GROUP BY dias.dia "
                "ORDER BY dias.dia"
            )
            return [VentaDia(**dict(r)) for r in rows]