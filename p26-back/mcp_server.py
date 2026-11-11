from mcp.server.mcpserver import MCPServer
import asyncpg
from db import DATABASE_URL

mcp = MCPServer("cafeteria-la-del-L")

async def consultar(sql, *args):
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(sql, *args)
        return [dict(row) for row in rows]
    finally:
        await conn.close()

@mcp.tool()
async def pedidos_por_status(status: str) -> list[dict]:
    """Regresa los pedidos con el status indicado (PENDIENTE, EN PROCESO, LISTO, ENTREGADO o CANCELADO), con fecha, total y nombre del cliente."""
    return await consultar(
        "SELECT p.id, "
        "to_char(p.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') AS fecha, "
        "p.total::float AS total, p.status, u.nombre AS cliente "
        "FROM pedido p JOIN usuario u ON u.id = p.usuario_id "
        "WHERE p.status = $1 "
        "ORDER BY p.id DESC LIMIT 50",
        status.upper()
    )


@mcp.tool()
async def ventas_por_dia(dias: int) -> list[dict]:
    """Regresa el total vendido y el número de pedidos por día en los últimos N días, sin contar cancelados."""
    return await consultar(
        "SELECT to_char(dias.dia, 'YYYY-MM-DD') AS fecha, "
        "COALESCE(SUM(p.total), 0)::float AS total, "
        "COUNT(p.id) AS pedidos "
        "FROM generate_series("
        "(now() AT TIME ZONE 'America/Mexico_City')::date - $1::int, "
        "(now() AT TIME ZONE 'America/Mexico_City')::date, "
        "interval '1 day') AS dias(dia) "
        "LEFT JOIN pedido p "
        "ON (p.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date = dias.dia::date "
        "AND p.status <> 'CANCELADO' "
        "GROUP BY dias.dia "
        "ORDER BY dias.dia",
        dias
    )


@mcp.tool()
async def productos_disponibles() -> list[dict]:
    """Regresa los productos disponibles con su precio y si son CALIENTE o FRIO."""
    return await consultar(
        "SELECT id, nombre, precio::float AS precio, temperatura "
        "FROM producto WHERE disponible = TRUE ORDER BY nombre"
    )


@mcp.tool()
async def cambiar_precio_aguas(nuevo_precio: float) -> list[dict]:
    """Cambia el precio de TODAS las aguas frescas (los productos cuyo nombre empieza con 'Agua de') al nuevo precio indicado. Regresa la lista de productos modificados con su nuevo precio."""
    if nuevo_precio <= 0:
        raise ValueError("El precio debe ser mayor que cero")

    return await consultar(
        "UPDATE producto SET precio = $1 "
        "WHERE nombre ILIKE 'Agua de%' "
        "RETURNING id, nombre, precio::float AS precio",
        round(nuevo_precio, 2)
    )

if __name__ == "__main__":
    mcp.run()