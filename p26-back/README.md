# Backend P26

Backend de la tienda Kegovc construido con FastAPI, Strawberry GraphQL y PostgreSQL alojado en Supabase.

## Base de datos en la nube

- [Abrir proyecto en Supabase](https://supabase.com/dashboard/project/uofaxfmbilrtjorblprt)

La aplicación se conecta a PostgreSQL mediante la variable `DATABASE_URL`. No publiques esta URL con sus credenciales.

## Requisitos

- Python 3.10 o superior
- Acceso a la base de datos de Supabase

## Instalación

Desde esta carpeta, crea y activa un entorno virtual:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Instala las dependencias:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Variables de entorno

Crea un archivo `.env` en la raíz del backend con la cadena de conexión de PostgreSQL:

```env
DATABASE_URL=postgresql://postgres.uofaxfmbilrtjorblprt:e-commerce-kegovc@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
```

El archivo `.env` está excluido de Git mediante `.gitignore`. Usa la cadena de conexión proporcionada por Supabase y conserva sus credenciales únicamente en variables de entorno.

Agrega también `SECRET_KEY`, `MERCADOPAGO_ACCESS_TOKEN` y
`MERCADOPAGO_WEBHOOK_SECRET` al archivo `.env`. Durante las pruebas, usa la llave
pública de prueba en el frontend y el Access Token de prueba de la misma
aplicación aquí. No incluyas el Access Token ni el secreto del webhook en el
frontend.

## Ejecución

Inicia el servidor en modo desarrollo:

```powershell
python -m uvicorn main:app --reload
```

La API estará disponible en:

- GraphQL: http://127.0.0.1:8000/graphql
- Crear orden Checkout API: `POST http://127.0.0.1:8000/v1/orders` (requiere un
  token de acceso y el encabezado `X-Idempotency-Key`)
- Consultar estado del pedido: `GET http://127.0.0.1:8000/v1/orders/{pedido_id}/status`
- Webhook de Orders: `POST http://127.0.0.1:8000/v1/mercadopago/webhook`

En el panel de Mercado Pago, configura el evento **Order (Mercado Pago)** para
apuntar al webhook y copia el secreto generado a `MERCADOPAGO_WEBHOOK_SECRET`.
Para probar el webhook mientras el backend corre en localhost se necesita una
URL HTTPS pública temporal (por ejemplo, mediante un túnel); el checkout y la
creación de órdenes sí pueden probarse directamente en localhost.

Para iniciar el servidor en un puerto específico:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

El esquema GraphQL se define en `schema.py` y sus consultas y mutaciones se encuentran en la carpeta `resolvers/`.