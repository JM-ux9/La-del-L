import strawberry
from resolvers.producto import ProductoQueries, ProductoMutations
from resolvers.categoria import CategoriaQueries
from resolvers.pedido import PedidoQueries, PedidoMutations
from resolvers.usuario import UsuarioMutations

@strawberry.type
class Query(ProductoQueries, CategoriaQueries, PedidoQueries, DashboardQueries):
    pass


@strawberry.type
class Mutation(ProductoMutations, PedidoMutations, UsuarioMutations):
    pass

schema = strawberry.Schema(query=Query, mutation=Mutation)