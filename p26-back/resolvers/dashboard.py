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
class CategoriaVendida:
    categoria_id: int
    nombre: str
    cantidad_vendida: int
    total_vendido: float

async def ventas_intervalo_tiempo(info: strawberry.Info, interval: int) -> List[VentaDia]:
    pool = info.context["pool"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT to_char(dias.dia, 'YYYY-MM-DD') AS fecha, "
            "COALESCE(SUM(p.total), 0)::float AS total, "
            "COUNT(p.id) AS pedidos "
            "FROM generate_series("
            "(now() AT TIME ZONE 'America/Mexico_City')::date - $1::int, "
            "(now() AT TIME ZONE 'America/Mexico_City')::date, "
            "interval '1 day') AS dias(dia) "
            "LEFT JOIN pedido p "
            "ON (p.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date = dias.dia::date "
            "AND p.status = 'PAGADO' "
            "GROUP BY dias.dia "
            "ORDER BY dias.dia",
            interval
        )
        return [
            VentaDia(
                fecha=r["fecha"],
                total=float(r["total"]),
                pedidos=int(r["pedidos"]),
            )
            for r in rows
        ]

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
            return [
                ProductoVendido(
                    producto_id=r["producto_id"],
                    nombre=r["nombre"],
                    cantidad_vendida=int(r["cantidad_vendida"]),
                    total_vendido=float(r["total_vendido"]),
                )
                for r in rows
            ]

    @strawberry.field
    async def ventas_semana(self, info: strawberry.Info) -> List[VentaDia]:
        requerir_admin(info)
        pool = info.context["pool"]
        return await ventas_intervalo_tiempo(info, 6)

    @strawberry.field
    async def ventas_mes(self, info: strawberry.Info) -> List[VentaDia]:
        requerir_admin(info)
        pool = info.context["pool"]
        return await ventas_intervalo_tiempo(info, 29)

    @strawberry.field
    async def ventas_5_dias(self, info: strawberry.Info) -> List[VentaDia]:
        requerir_admin(info)
        pool = info.context["pool"]
        return await ventas_intervalo_tiempo(info, 4)

    @strawberry.field
    async def avg_week(self, info: strawberry.Info) -> float:
        requerir_admin(info)
        pool = info.context["pool"]
        pedidos = await ventas_intervalo_tiempo(info, 6)
        avg = (
            sum(item["total_vendido"] for item in pedidos) / len(pedidos) if pedidos else 0
        )
        return avg

    @strawberry.field
    async def avg_month(self, info: strawberry.Info) -> float:
        requerir_admin(info)
        pool = info.context["pool"]
        pedidos = await ventas_intervalo_tiempo(info, 29)
        avg = (
            sum(item["total_vendido"] for item in pedidos) / len(pedidos) if pedidos else 0
        )
        return avg

    @strawberry.field
    async def categorias_mas_vendidas(self, info: strawberry.Info) -> List[CategoriaVendida]:
        requerir_admin(info)
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT c.id AS categoria_id, c.nombre, "
                "COALESCE(SUM(d.cantidad), 0) AS cantidad_vendida, "
                "COALESCE(SUM(d.importe), 0)::float AS total_vendido "
                "FROM categoria c "
                "LEFT JOIN producto p ON p.categoria_id = c.id "
                "LEFT JOIN detalle_pedido d ON d.producto_id = p.id "
                "GROUP BY c.id, c.nombre "
                "ORDER BY cantidad_vendida DESC"
            )
            return [
                CategoriaVendida(
                    categoria_id=r["categoria_id"],
                    nombre=r["nombre"],
                    cantidad_vendida=int(r["cantidad_vendida"]),
                    total_vendido=float(r["total_vendido"]),
                )
                for r in rows
            ]