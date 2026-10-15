import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

import main
from mercadopago.config import RequestOptions
from mercadopago_service import crear_pago


class FakeConnection:
    def __init__(self, order):
        self.order = order
        self.executed = []

    async def fetchrow(self, query, pedido_id):
        return self.order

    async def execute(self, query, status, pedido_id):
        self.executed.append((status, pedido_id))


class FakeAcquire:
    def __init__(self, connection):
        self.connection = connection

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, *args):
        return False


class FakePool:
    def __init__(self, order):
        self.connection = FakeConnection(order)

    def acquire(self):
        return FakeAcquire(self.connection)


def make_request(pool):
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(pool=pool)))


class CrearPagoEndpointTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.datos = main.CrearPagoRequest.model_validate({
            "pedido_id": 42,
            "token": "card-token",
            "payment_method_id": "visa",
            "installments": 1,
            "issuer_id": "1234",
            "payer": {
                "email": "comprador@example.com",
                "identification": {"type": "DNI", "number": "12345678"},
            },
        })
        self.pool = FakePool({
            "id": 42,
            "total": 35.5,
            "usuario_id": 7,
            "status": "PENDIENTE",
        })

    async def test_creates_payment_with_database_order_amount(self):
        resultado_sdk = {
            "status": 201,
            "response": {
                "id": 987,
                "status": "approved",
                "status_detail": "accredited",
                "payment_method_id": "visa",
                "installments": 1,
            },
        }
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch("main.crear_pago", return_value=resultado_sdk) as crear_pago,
        ):
            respuesta = await main.crear_pago_endpoint(
                self.datos,
                make_request(self.pool),
                idempotency_key="idempotency-42",
                authorization="Bearer access-token",
            )

        self.assertEqual(respuesta["status"], "approved")
        self.assertEqual(respuesta["pedido_id"], 42)
        self.assertEqual(self.pool.connection.executed, [("PAGADO", 42)])
        payload = crear_pago.call_args.args[1]
        self.assertEqual(payload["transaction_amount"], 35.5)
        self.assertEqual(payload["payer"]["email"], "comprador@example.com")
        self.assertEqual(crear_pago.call_args.args[2], "idempotency-42")

    async def test_creates_payment_when_brick_omits_optional_identification(self):
        datos = main.CrearPagoRequest.model_validate({
            "pedido_id": 42,
            "token": "card-token",
            "payment_method_id": "visa",
            "installments": 1,
            "issuer_id": "1234",
            "payer": {"email": "comprador@example.com"},
        })
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch(
                "main.crear_pago",
                return_value={
                    "status": 201,
                    "response": {"id": 989, "status": "approved"},
                },
            ) as crear_pago,
        ):
            await main.crear_pago_endpoint(
                datos,
                make_request(self.pool),
                idempotency_key="idempotency-without-identification",
                authorization="Bearer access-token",
            )

        payer = crear_pago.call_args.args[1]["payer"]
        self.assertEqual(payer, {"email": "comprador@example.com"})

    async def test_rejected_payment_updates_order_status(self):
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch(
                "main.crear_pago",
                return_value={
                    "status": 201,
                    "response": {"id": 988, "status": "rejected"},
                },
            ),
        ):
            respuesta = await main.crear_pago_endpoint(
                self.datos,
                make_request(self.pool),
                idempotency_key="idempotency-rejected",
                authorization="Bearer access-token",
            )

        self.assertEqual(respuesta["status"], "rejected")
        self.assertEqual(self.pool.connection.executed, [("RECHAZADO", 42)])

    async def test_does_not_allow_payment_for_another_users_order(self):
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 8}),
            patch("main.sdk", object()),
            patch("main.crear_pago") as crear_pago,
        ):
            with self.assertRaises(HTTPException) as error:
                await main.crear_pago_endpoint(
                    self.datos,
                    make_request(self.pool),
                    idempotency_key="idempotency-unauthorized",
                    authorization="Bearer access-token",
                )

        self.assertEqual(error.exception.status_code, 404)
        crear_pago.assert_not_called()

    def test_openapi_requires_the_idempotency_header(self):
        operation = main.app.openapi()["paths"]["/v1/payments"]["post"]
        headers = {
            parameter["name"]: parameter
            for parameter in operation["parameters"]
            if parameter["in"] == "header"
        }

        self.assertTrue(headers["X-Idempotency-Key"]["required"])


class MercadoPagoServiceTests(unittest.TestCase):
    def test_uses_sdk_request_options_for_idempotency_header(self):
        payment = SimpleNamespace(create=lambda *args, **kwargs: kwargs)
        sdk = SimpleNamespace(payment=lambda: payment)

        resultado = crear_pago(sdk, {"token": "card-token"}, "idempotency-42")

        opciones = resultado["request_options"]
        self.assertIsInstance(opciones, RequestOptions)
        self.assertEqual(opciones.custom_headers, {"X-Idempotency-Key": "idempotency-42"})


if __name__ == "__main__":
    unittest.main()
