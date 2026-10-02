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

## Ejecución

Inicia el servidor en modo desarrollo:

```powershell
python -m uvicorn main:app --reload
```

La API estará disponible en:

- GraphQL: http://127.0.0.1:8000/graphql

Para iniciar el servidor en un puerto específico:

```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

El esquema GraphQL se define en `schema.py` y sus consultas y mutaciones se encuentran en la carpeta `resolvers/`.