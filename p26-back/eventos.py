"""Bus de eventos en memoria (pub/sub) para las Subscriptions de GraphQL.

Funciona con UN solo proceso de uvicorn. Con varios workers o instancias, un evento
publicado en un proceso no llega a los suscriptores de otro (habría que usar Redis
o LISTEN/NOTIFY de Postgres).
"""
import asyncio
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, AsyncIterator

MAX_PENDIENTES = 100  # eventos en espera por suscriptor antes de descartar los más viejos

CANAL_PEDIDOS = "pedidos"  # todos los pedidos (para un futuro back office)

_suscriptores: dict[str, set[asyncio.Queue]] = defaultdict(set)


def canal_pedido(pedido_id: int) -> str:
    return f"pedido:{pedido_id}"


def publicar(canal: str, datos: Any) -> None:
    for cola in list(_suscriptores.get(canal, ())):
        if cola.full():
            cola.get_nowait()
        cola.put_nowait(datos)


@asynccontextmanager
async def suscribir(canal: str) -> AsyncIterator[asyncio.Queue]:
    cola: asyncio.Queue = asyncio.Queue(maxsize=MAX_PENDIENTES)
    _suscriptores[canal].add(cola)
    try:
        yield cola
    finally:
        _suscriptores[canal].discard(cola)
        if not _suscriptores[canal]:
            del _suscriptores[canal]


async def escuchar(canal: str) -> AsyncGenerator[Any, None]:
    async with suscribir(canal) as cola:
        while True:
            yield await cola.get()


def suscriptores(canal: str) -> int:
    return len(_suscriptores.get(canal, ()))