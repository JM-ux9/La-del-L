from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
EXPIRACION_HORAS = 24


def generar_token(payload: dict) -> str:
    data = payload.copy()
    expiracion = datetime.now(timezone.utc) + timedelta(hours=EXPIRACION_HORAS)
    data.update({"exp": expiracion})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None