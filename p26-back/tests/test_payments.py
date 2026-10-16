import hashlib
import hmac
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

import main
from mercadopago.config import RequestOptions
from mercadopago_service import crear_orden, validar_firma_webhook


class FakeConnection:
    def __init__(self, order):
        self.order = order
        self.executed = []

    async def fetchrow(self, query, *args):
        if query.lstrip().startswith("UPDATE"):
            self.executed.append(args)
        return self.order

    async def execute(self, query, *args):
        self.executed.append(args)


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


class CrearOrdenEndpointTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.datos = main.CrearOrdenRequest.model_validate({
            "pedido_id": 42,
            "token": "a" * 32,
            "payment_method_id": "visa",
            "payment_method_type": "credit_card",
            "installments": 1,
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

    async def test_creates_checkout_api_order_with_database_total(self):
        resultado_sdk = {
            "status": 201,
            "response": {
                "id": "order-987",
                "status": "processed",
                "status_detail": "accredited",
                "total_amount": "35.50",
            },
        }
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch("main.crear_orden", return_value=resultado_sdk) as crear_orden_mock,
        ):
            respuesta = await main.crear_orden_endpoint(
                self.datos,
                make_request(self.pool),
                idempotency_key="idempotency-42",
                authorization="Bearer test-token",
            )

        self.assertEqual(respuesta["status"], "processed")
        self.assertEqual(respuesta["pedido_id"], 42)
        self.assertEqual(respuesta["id"], "order-987")
        self.assertEqual(self.pool.connection.executed, [("PAGADO", 42)])
        payload = crear_orden_mock.call_args.args[1]
        self.assertEqual(payload["type"], "online")
        self.assertEqual(payload["processing_mode"], "automatic")
        self.assertEqual(payload["capture_mode"], "automatic")
        self.assertEqual(payload["total_amount"], "35.50")
        self.assertEqual(payload["external_reference"], "42")
        self.assertEqual(payload["payer"]["email"], "comprador@example.com")
        self.assertEqual(
            payload["transactions"]["payments"][0],
            {
                "amount": "35.50",
                "payment_method": {
                    "id": "visa",
                    "type": "credit_card",
                    "token": "a" * 32,
                    "installments": 1,
                },
            },
        )
        self.assertEqual(crear_orden_mock.call_args.args[2], "idempotency-42")

    async def test_pending_order_does_not_mark_local_order_as_paid(self):
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch(
                "main.crear_orden",
                return_value={
                    "status": 201,
                    "response": {
                        "id": "order-988",
                        "status": "processing",
                        "status_detail": "pending_review",
                    },
                },
            ),
        ):
            respuesta = await main.crear_orden_endpoint(
                self.datos,
                make_request(self.pool),
                idempotency_key="idempotency-processing",
                authorization="Bearer test-token",
            )

        self.assertEqual(respuesta["status"], "processing")
        self.assertEqual(self.pool.connection.executed, [])

    async def test_canceled_order_updates_local_order_as_rejected(self):
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch(
                "main.crear_orden",
                return_value={
                    "status": 201,
                    "response": {"id": "order-989", "status": "canceled"},
                },
            ),
        ):
            respuesta = await main.crear_orden_endpoint(
                self.datos,
                make_request(self.pool),
                idempotency_key="idempotency-canceled",
                authorization="Bearer test-token",
            )

        self.assertEqual(respuesta["status"], "canceled")
        self.assertEqual(
            self.pool.connection.executed,
            [("RECHAZADO", 42, "PAGADO")],
        )

    async def test_accepts_cardholder_without_optional_identification(self):
        datos = main.CrearOrdenRequest.model_validate({
            "pedido_id": 42,
            "token": "b" * 32,
            "payment_method_id": "debvisa",
            "payment_method_type": "debit_card",
            "installments": 1,
            "payer": {"email": "comprador@example.com"},
        })
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 7}),
            patch("main.sdk", object()),
            patch(
                "main.crear_orden",
                return_value={
                    "status": 201,
                    "response": {"id": "order-990", "status": "processing"},
                },
            ) as crear_orden_mock,
        ):
            await main.crear_orden_endpoint(
                datos,
                make_request(self.pool),
                idempotency_key="idempotency-without-identification",
                authorization="Bearer test-token",
            )

        payer = crear_orden_mock.call_args.args[1]["payer"]
        self.assertEqual(payer, {"email": "comprador@example.com"})
        self.assertEqual(
            crear_orden_mock.call_args.args[1]["transactions"]["payments"][0][
                "payment_method"
            ]["type"],
            "debit_card",
        )

    async def test_does_not_create_order_for_another_users_purchase(self):
        with (
            patch("main.usuario_desde_autorizacion", return_value={"usuario_id": 8}),
            patch("main.sdk", object()),
            patch("main.crear_orden") as crear_orden_mock,
        ):
            with self.assertRaises(HTTPException) as error:
                await main.crear_orden_endpoint(
                    self.datos,
                    make_request(self.pool),
                    idempotency_key="idempotency-unauthorized",
                    authorization="Bearer test-token",
                )

        self.assertEqual(error.exception.status_code, 404)
        crear_orden_mock.assert_not_called()

    async def test_order_webhook_marks_matching_paid_order(self):
        pool = FakePool({"id": 42, "total": 35.5, "status": "PENDIENTE"})
        request = SimpleNamespace(
            app=SimpleNamespace(state=SimpleNamespace(pool=pool)),
            query_params={"type": "order", "data.id": "ORDER-42"},
            headers={"x-signature": "signed", "x-request-id": "request-42"},
        )
        orden = {
            "id": "ORDER-42",
            "external_reference": "42",
            "status": "processed",
            "total_amount": "35.50",
        }
        with (
            patch("main.mercadopago_webhook_secret", "webhook-secret"),
            patch("main.sdk", object()),
            patch("main.validar_firma_webhook", return_value=True),
            patch("main.obtener_orden", return_value={"status": 200, "response": orden}),
        ):
            respuesta = await main.recibir_webhook_mercadopago(request)

        self.assertEqual(respuesta, {"received": True})
        self.assertEqual(pool.connection.executed, [("PAGADO", 42)])

    async def test_order_webhook_rejects_amount_mismatch(self):
        pool = FakePool({"id": 42, "total": 35.5, "status": "PENDIENTE"})
        request = SimpleNamespace(
            app=SimpleNamespace(state=SimpleNamespace(pool=pool)),
            query_params={"type": "order", "data.id": "ORDER-42"},
            headers={"x-signature": "signed", "x-request-id": "request-42"},
        )
        orden = {
            "id": "ORDER-42",
            "external_reference": "42",
            "status": "processed",
            "total_amount": "1.00",
        }
        with (
            patch("main.mercadopago_webhook_secret", "webhook-secret"),
            patch("main.sdk", object()),
            patch("main.validar_firma_webhook", return_value=True),
            patch("main.obtener_orden", return_value={"status": 200, "response": orden}),
        ):
            with self.assertRaises(HTTPException) as error:
                await main.recibir_webhook_mercadopago(request)

        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(pool.connection.executed, [])

    def test_openapi_requires_the_idempotency_header_on_order_creation(self):
        operation = main.app.openapi()["paths"]["/v1/orders"]["post"]
        headers = {
            parameter["name"]: parameter
            for parameter in operation["parameters"]
            if parameter["in"] == "header"
        }

        self.assertTrue(headers["X-Idempotency-Key"]["required"])


class MercadoPagoServiceTests(unittest.TestCase):
    def test_creates_orders_using_the_sdk_orders_resource(self):
        orders = SimpleNamespace(create=lambda *args, **kwargs: kwargs)
        sdk = SimpleNamespace(order=lambda: orders)

        resultado = crear_orden(sdk, {"type": "online"}, "idempotency-42")

        opciones = resultado["request_options"]
        self.assertIsInstance(opciones, RequestOptions)
        self.assertEqual(opciones.custom_headers, {"X-Idempotency-Key": "idempotency-42"})

    def test_verifies_order_webhook_signature(self):
        secret = "webhook-secret"
        request_id = "request-123"
        data_id = "ORD01ABC"
        timestamp = "1742505638683"
        manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{timestamp};"
        signature = hmac.new(
            secret.encode(),
            manifest.encode(),
            hashlib.sha256,
        ).hexdigest()

        self.assertTrue(
            validar_firma_webhook(
                secret,
                f"ts={timestamp},v1={signature}",
                request_id,
                data_id,
            )
        )
        self.assertFalse(
            validar_firma_webhook(
                secret,
                "ts=1,v1=invalid",
                request_id,
                data_id,
            )
        )


if __name__ == "__main__":
    unittest.main()
