# Frontend de Café del L

Aplicación web de la tienda **Café del L**, construida con Astro 7, React 19 y Zustand. Consume el backend mediante GraphQL y REST para consultar el catálogo, administrar pedidos y procesar pagos con Mercado Pago.

## Requisitos

- Node.js 22.12 o superior
- npm
- Backend ejecutándose en `http://localhost:8000`

## Instalación y ejecución

Desde esta carpeta:

```powershell
npm install
npm run dev
```

El servidor de desarrollo estará disponible en `http://localhost:4321`.

| Comando | Acción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Previsualiza la compilación de producción |

## Variables de entorno

Crea un archivo `.env` en la raíz de `front/`:

```env
PUBLIC_GRAPHQL_URL=http://localhost:8000/graphql
PUBLIC_API_URL=http://localhost:8000
PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-tu-clave-publica
```

- `PUBLIC_GRAPHQL_URL`: endpoint GraphQL. Por defecto usa `http://localhost:8000/graphql`.
- `PUBLIC_API_URL`: URL base de la API REST. Por defecto se deriva del endpoint GraphQL.
- `PUBLIC_MERCADOPAGO_PUBLIC_KEY`: clave pública de Mercado Pago de la misma aplicación configurada en el backend.

No uses aquí el Access Token ni secretos privados de Mercado Pago.

## Funcionalidades

- Catálogo de productos y navegación por categorías.
- Registro, inicio de sesión, perfil y carrito.
- Checkout con Card Payment Brick de Mercado Pago.
- Consulta del estado y detalle de pedidos del usuario.
- Suscripciones y panel de administración.
- Administración de productos, usuarios y pedidos.
- Suscripciones GraphQL para recibir cambios de pedidos en tiempo real.

## Rutas principales

| Ruta | Función |
| --- | --- |
| `/` | Inicio y catálogo |
| `/categorias/[id]` | Productos por categoría |
| `/products/[id]` | Detalle de producto |
| `/carrito` | Carrito de compras |
| `/checkout` | Checkout |
| `/login` | Inicio de sesión |
| `/perfil` | Perfil del usuario |
| `/mis-pedidos` | Pedidos del usuario |
| `/pago-error` | Resultado fallido del pago |
| `/dashboard` | Dashboard administrativo |
| `/admin/pedidos` | Administración de pedidos |
| `/admin/pedidos-en-proceso` | Pedidos en proceso |
| `/admin/productos` | Administración de productos |
| `/admin/usuarios` | Administración de usuarios |

## Integración con el backend

El cliente GraphQL se encuentra en `src/services/`, al igual que los servicios de autenticación, pagos y suscripciones. Las consultas y mutaciones se envían al endpoint configurado por `PUBLIC_GRAPHQL_URL`.

Los pagos usan la API REST `POST /v1/orders`. El backend valida que los importes provengan de los productos almacenados en la base de datos y utiliza el endpoint `/v1/mercadopago/webhook` para recibir actualizaciones de Mercado Pago. Para pruebas locales con webhooks, el backend debe estar accesible mediante una URL HTTPS pública temporal.
