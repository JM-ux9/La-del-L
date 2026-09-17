import strawberry
from typing import Annotated, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from resolvers.producto import Producto

@strawberry.type
class Categoria:
    id: int
    nombre: str

    @strawberry.field
    async def productos(
        self, info: strawberry.Info
    ) -> List[Annotated["Producto", strawberry.lazy("resolvers.producto")]]:
        from resolvers.producto import Producto
        
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM producto WHERE categoria_id = $1", self.id)
            return [Producto(**dict(r)) for r in rows]

@strawberry.type
class CategoriaQueries:
    @strawberry.field
    async def categorias(self, info: strawberry.Info) -> List[Categoria]:
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM categoria")
            return [Categoria(**dict(r)) for r in rows]

    @strawberry.field
    async def categoria(self, info: strawberry.Info, id: int) -> Optional[Categoria]:
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM categoria WHERE id = $1", id)
            return Categoria(**dict(row)) if row else None