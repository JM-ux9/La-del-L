import strawberry
from resolvers.producto import ProductoQueries, ProductoMutations
from resolvers.categoria import CategoriaQueries
from resolvers.pedido import PedidoQueries, PedidoMutations

@strawberry.type
class Query(ProductoQueries, CategoriaQueries, PedidoQueries):
    pass


@strawberry.type
class Mutation(ProductoMutations, PedidoMutations):
    pass

schema = strawberry.Schema(query=Query, mutation=Mutation)