# Cafe del L - Frontend

Frontend de la aplicación de cafetería, desarrollado con React y Vite. Permite consultar categorías y productos, ver el detalle de cada producto, agregar productos al carrito y confirmar pedidos.

## Requisitos

- Node.js y npm instalados.
- Backend GraphQL ejecutándose en `http://localhost:8000/graphql`.

El endpoint del backend está configurado en `src/services/api.js`. Sin el backend activo, la aplicación puede abrirse, pero no podrá cargar categorías ni productos.

## Instalación

Entra en la carpeta del frontend e instala las dependencias:

```bash
cd p26-front
npm install
```

## Comandos disponibles

### Desarrollo

Inicia Vite con recarga automática:

```bash
npm run dev
```

Abre la URL que muestre Vite, normalmente `http://localhost:5173`.

### Lint

Revisa el código con Oxlint:

```bash
npm run lint
```

### Build de producción

Genera los archivos optimizados en la carpeta `dist`:

```bash
npm run build
```

### Previsualización

Después de crear el build, inicia un servidor local para revisar la versión de producción:

```bash
npm run preview
```

## Flujo principal

1. La pantalla inicial muestra el catálogo y las categorías.
2. Una categoría abre su listado de productos.
3. Una tarjeta de producto abre el detalle.
4. El producto puede agregarse al carrito.
5. El carrito permite cambiar cantidades o quitar productos.
6. Checkout envía el pedido al backend GraphQL.

## Tecnologías

- React 19
- React DOM
- Vite
- Oxlint
- GraphQL mediante `fetch`
