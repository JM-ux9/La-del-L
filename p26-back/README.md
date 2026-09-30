# Backend P26

Backend de la tienda Kegovc, construido con FastAPI, Strawberry GraphQL y PostgreSQL. La configuración actual usa un proyecto de Supabase.

## Requisitos

- Python 3.10 o superior
- Una base de datos PostgreSQL accesible por el backend

El [proyecto de Supabase](https://supabase.com/dashboard/project/uofaxfmbilrtjorblprt) aloja la base de datos utilizada en desarrollo. La aplicación espera las tablas `usuario`, `categoria`, `producto`, `pedido` y `detalle_pedido`.

## Instalación

Desde esta carpeta, crea y activa un entorno virtual de PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Instala las dependencias:

```powershell
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn strawberry-graphql asyncpg python-dotenv python-jose passlib[argon2] email-validator
```

## Configuración

Crea un archivo `.env` en la raíz del backend. Sustituye los valores de ejemplo; no guardes contraseñas ni claves reales en el repositorio.

```env
DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST:PUERTO/BASE_DE_DATOS
SECRET_KEY=REEMPLAZAR_POR_UN_SECRETO_ALEATORIO
```

`DATABASE_URL` es la cadena de conexión PostgreSQL proporcionada por tu proveedor. `SECRET_KEY` se usa para firmar los tokens JWT. Puedes generar un valor aleatorio con:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

El archivo `.env` está excluido de Git. Mantén ambas variables privadas y configura los mismos valores en el entorno donde despliegues el servicio.

## Ejecución

Inicia el servidor en modo desarrollo:

```powershell
python -m uvicorn main:app --reload
```

El endpoint GraphQL estará disponible en `http://127.0.0.1:8000/graphql`. Para escuchar en todas las interfaces y especificar el puerto:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## API GraphQL

Las consultas disponibles son `productos`, `producto`, `categorias`, `categoria` y `pedidos`. Las mutaciones son `crearUsuario`, `login`, `crearPedido`, `crearProducto`, `actualizarProducto` y `eliminarProducto`. El esquema se arma en `schema.py`; los tipos y resolvers están en `resolvers/`.

El registro de usuario y las consultas del catálogo son públicos. `crearPedido` requiere una sesión; `pedidos` y las mutaciones de productos requieren un usuario con rol `ADMIN`. Para operaciones autenticadas, envía el token devuelto por `login` en el encabezado:

```http
Authorization: Bearer <token>
```

Los tokens vencen después de 24 horas. El registro valida que el correo sea entregable, por lo que necesita acceso a Internet.

## CORS y despliegue

El servidor actualmente permite cualquier origen, método y encabezado mediante CORS. Antes de exponerlo en producción, restringe `allow_origins` en `main.py` a los dominios del frontend y usa secretos de entorno específicos del despliegue.