# Backend P26

Backend de la tienda **Café del L**, construido con FastAPI, Strawberry GraphQL y PostgreSQL alojado en Supabase. También expone endpoints REST para crear y consultar órdenes de Mercado Pago y recibir webhooks.

## Requisitos

- Python 3.10 o superior
- PostgreSQL/Supabase
- Credenciales de Mercado Pago y Brevo

## Instalación

Desde esta carpeta, crea y activa un entorno virtual:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Variables de entorno

Crea un archivo `.env` en la raíz de `p26-back/`:

```env
DATABASE_URL=postgresql://usuario:password@host:5432/postgres
SECRET_KEY=una-clave-secreta-larga
MERCADOPAGO_ACCESS_TOKEN=TEST-tu-access-token
MERCADOPAGO_WEBHOOK_SECRET=tu-secreto-del-webhook
BREVO-API-KEY=tu-api-key-de-brevo
```

- `DATABASE_URL`: cadena de conexión a PostgreSQL/Supabase.
- `SECRET_KEY`: clave usada para firmar los JSON Web Tokens.
- `MERCADOPAGO_ACCESS_TOKEN`: Access Token de Mercado Pago usado por el SDK del backend.
- `MERCADOPAGO_WEBHOOK_SECRET`: secreto usado para validar la firma del webhook de Orders.
- `BREVO-API-KEY`: API key usada para enviar correos transaccionales con Brevo.

El archivo `.env` está excluido de Git. No publiques credenciales ni las incluyas en el frontend. Durante las pruebas, utiliza el Access Token y la clave pública que pertenezcan a la misma aplicación de Mercado Pago en modo prueba.

## Ejecución

```powershell
python -m uvicorn main:app --reload
```

Endpoints principales:

- GraphQL: `http://127.0.0.1:8000/graphql`
- Crear orden: `POST http://127.0.0.1:8000/v1/orders`
- Consultar estado: `GET http://127.0.0.1:8000/v1/orders/{pedido_id}/status`
- Webhook de Mercado Pago: `POST http://127.0.0.1:8000/v1/mercadopago/webhook`

La creación de órdenes requiere un token de acceso válido y el encabezado `X-Idempotency-Key`. El frontend envía los datos del checkout, pero el importe se obtiene desde los productos guardados en la base de datos.

## Webhooks de Mercado Pago

Configura el evento **Order (Mercado Pago)** para que apunte a `/v1/mercadopago/webhook` y copia el secreto generado a `MERCADOPAGO_WEBHOOK_SECRET`.

Mercado Pago necesita una URL HTTPS pública. Para probar webhooks con el servidor local, usa un túnel HTTPS temporal. El checkout y la creación de órdenes sí pueden probarse directamente en localhost.

Si Mercado Pago rechaza el pago, el backend consulta la orden disponible y traduce el `status_detail` conocido a un mensaje en español. Si la creación falla o Mercado Pago no genera una orden consultable, devuelve un error de integración sin modificar el pedido local.

## Tecnologías

- FastAPI y Strawberry GraphQL.
- Suscripciones SSE y WebSocket.
- PostgreSQL mediante `asyncpg` y Supabase.
- JWT con python-jose y hashing Argon2/passlib.
- Mercado Pago Checkout API.
- Brevo para correos de bienvenida, pedidos y cambios de estado.
- Pydantic para validación de solicitudes REST.

El esquema GraphQL está en `schema.py`; las consultas, mutaciones y suscripciones están en `resolvers/`.

## Pruebas

Desde el directorio del backend:

```powershell
python -m unittest tests/test_payments.py
```
