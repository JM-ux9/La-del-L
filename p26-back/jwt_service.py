from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
REFRESH_EXPIRACION_DIAS = 7
ACCESS_EXPIRACION_MIN = 30


def generar_access_token(payload: dict) -> str:
    data = payload.copy()
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRACION_MIN)
    data.update({"exp": expiracion, "tipo": "access"})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def generar_refresh_token(payload: dict) -> str:
    data = payload.copy()
    jti = str(uuid.uuid4())
    expiracion = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRACION_DIAS)
    data.update({"exp": expiracion, "tipo": "refresh", "jti": jti})
    token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti

def decodificar_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None