import strawberry
from typing import Annotated, List, Optional, TYPE_CHECKING
from auth import requerir_usuario, requerir_admin

if TYPE_CHECKING:
    from resolvers.categoria import Categoria

@strawberry.type
class Producto:
    id: int
    nombre: str
    precio: float
    imagen: Optional[str] = None
    categoria_id: strawberry.Private[int]
    disponible: Optional[bool] = None

    @strawberry.field
    async def categoria(
        self, info: strawberry.Info
    ) -> Annotated["Categoria", strawberry.lazy("resolvers.categoria")]:
        from resolvers.categoria import Categoria

        pool = info.context["pool"]
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM categoria WHERE id = $1", self.categoria_id)
            return Categoria(**dict(row)) if row else None

@strawberry.input
class ProductoInput:
    nombre: str
    precio: float
    imagen: Optional[str] = None
    categoria: int
    disponible: Optional[bool] = None

@strawberry.type
class ProductoQueries:
    @strawberry.field
    async def productos(self, info: strawberry.Info, limite: Optional[int] = None, desde: Optional[int] = None) -> List[Producto]:
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM producto ORDER BY id LIMIT $1 OFFSET $2", limite or 10, desde or 0)
            return [Producto(**dict(r)) for r in rows]

    @strawberry.field
    async def producto(self, info: strawberry.Info, id: int) -> Optional[Producto]:
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM producto WHERE id = $1", id)
            return Producto(**dict(row)) if row else None

@strawberry.type
class ProductoMutations:
    @strawberry.mutation
    async def crear_producto(self, info: strawberry.Info, datos: ProductoInput) -> Producto:
        requerir_admin(info)
        pool = info.context["pool"]

        async with pool.acquire() as conn:
            if datos.disponible is None:
                datos.disponible = True
            if datos.imagen is None:
                datos.imagen = f"https://placehold.co/600x400/blue/white?text={datos.nombre.replace(' ', '+')}"
            row = await conn.fetchrow("INSERT INTO producto (nombre, precio, imagen, categoria_id, disponible) VALUES ($1, $2, $3, $4, $5) RETURNING *", datos.nombre, datos.precio, datos.imagen, datos.categoria, datos.disponible)
            return Producto(**dict(row))

    @strawberry.mutation
    async def actualizar_producto(self, info: strawberry.Info, id: int, datos: ProductoInput) -> Optional[Producto]:
        requerir_admin(info)
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            actual = await conn.fetchrow("SELECT imagen FROM producto WHERE id = $1", id)
            if actual is None:
                raise Exception(f"No existe el producto {id}")

            imagen = datos.imagen if datos.imagen is not None else actual["imagen"]
            disponible = True if datos.disponible is None else datos.disponible

            row = await conn.fetchrow(
                "UPDATE producto SET nombre = $1, precio = $2, imagen = $3, categoria_id = $4, disponible = $5 WHERE id = $6 RETURNING *",
                datos.nombre.strip(), datos.precio, imagen, datos.categoria, disponible, id
            )
            return Producto(**dict(row)) if row else None

    @strawberry.mutation
    async def eliminar_producto(self, info: strawberry.Info, id: int) -> bool:
        requerir_admin(info)
        pool = info.context["pool"]
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM producto WHERE id = $1", id)
            if not result.endswith("1"):
                raise Exception(f"No existe el producto {id}")
            return True
