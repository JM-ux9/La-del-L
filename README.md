# Café del L — E-commerce (Frontend + Backend)

E-Commerce para la Cafetería del L. Construida con Astro + React en el frontend y FastAPI + Strawberry GraphQL en el backend, consumiendo una base de datos PostgreSQL en Supabase.

## Estructura del proyecto

```
La-del-L/
├── front/          # Frontend (Astro + React)
├── p26-back/       # Backend (FastAPI + GraphQL)
└── README.md       # Este archivo
```

---

## Frontend — `front/`

### Requisitos
- Node.js 22.12 o superior
- npm
- Backend ejecutándose en `http://localhost:8000`

### Instalación y ejecución

Desde la carpeta `front/`:

```powershell
npm install
npm run dev
```

El servidor de desarrollo estará disponible en `http://localhost:4321`.

| Comando | Acción |
|---|---|
| `npm run dev` | Iniciar el servidor de desarrollo |
| `npm run build` | Generar la versión de producción en `dist/` |
| `npm run preview` | Previsualizar la compilación de producción |

### Variables de entorno

Crear un archivo `.env` en la raíz de `front/`:

- `PUBLIC_GRAPHQL_URL`: endpoint GraphQL del backend.
- `PUBLIC_API_URL`: URL base de la API REST.
- `PUBLIC_MERCADOPAGO_PUBLIC_KEY`: clave pública de Mercado Pago (modo prueba).

### Rutas principales

| Ruta | Función |
|---|---|
| `/` | Inicio y catálogo |
| `/categorias/[id]` | Productos por categoría |
| `/products/[id]` | Detalle de producto |
| `/carrito` | Carrito de compras |
| `/checkout` | Checkout |
| `/login` | Inicio de sesión |
| `/perfil` | Perfil del usuario |

---

## Backend — `p26-back/`

### Requisitos
- Python 3.10 o superior
- PostgreSQL / Supabase
- Credenciales de Mercado Pago y Brevo

### Instalación

Desde la carpeta `p26-back/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Variables de entorno

Crear un archivo `.env` en la raíz de `p26-back/`:

- `DATABASE_URL`: cadena de conexión a PostgreSQL/Supabase.
- `SECRET_KEY`: clave para firmar los JSON Web Tokens.
- `MERCADOPAGO_PUBLIC_KEY`: clave pública de Mercado Pago para el backend.
- `MERCADOPAGO_ACCESS_TOKEN`: Access Token de Mercado Pago usado por el SDK del backend.
- `BREVO-API-KEY`: API key para enviar correos transaccionales con Brevo.
- `BREVO-MCP-API-KEY`: API key de Brevo para el servidor MCP.

### Ejecución

```powershell
python -m uvicorn main:app --reload
```

El backend estará disponible en `http://127.0.0.1:8000`.

| Endpoint | Descripción |
|---|---|
| `POST /graphql` | GraphQL (consultas, mutaciones, suscripciones) |
| `POST /v1/orders` | Crear orden de pago |
| `GET /v1/orders/{pedido_id}/status` | Consultar estado de un pedido |
| `POST /v1/mercadopago/webhook` | Webhook de Mercado Pago |

---