import os
import uuid
from typing import Annotated

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from jwt_service import usuario_desde_header

load_dotenv()
router = APIRouter(prefix="/v1")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET = "imagenes-productos"
TAMANO_MAXIMO = 2 * 1024 * 1024

EXTENSIONES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def subir_a_supabase(ruta, contenido, tipo):
    respuesta = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{ruta}",
                headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": tipo,
            "x-upsert": "true",
        },
        data=contenido,
        timeout=30,
    )
    return respuesta


@router.post("/imagenes")
async def subir_imagen(
    archivo: Annotated[UploadFile, File()],
    authorization: Annotated[str | None, Header()] = None,
):
    usuario, expirado = usuario_desde_header(authorization)
    if usuario is None:
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRADO" if expirado else "No autenticado")
    elif usuario["rol"] != "ADMIN":
        raise HTTPException(status_code=403, detail="No autorizado")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="El almacenamiento de imágenes no está configurado")

    if archivo.content_type not in EXTENSIONES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG o WebP")

    contenido = await archivo.read()
    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(status_code=400, detail="La imagen no puede pesar más de 2 MB")

    ruta = f"{uuid.uuid4().hex}.{EXTENSIONES[archivo.content_type]}"
    status = await run_in_threadpool(subir_a_supabase, ruta, contenido, archivo.content_type)

    respuesta = await run_in_threadpool(subir_a_supabase, ruta, contenido, archivo.content_type)

    if respuesta.status_code >= 300:
        print("Error de Supabase:", respuesta.status_code, respuesta.text)
        raise HTTPException(status_code=502, detail="No se pudo subir la imagen")

    return {"url": f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{ruta}"}