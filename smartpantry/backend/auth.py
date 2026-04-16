import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, Header, HTTPException
from bson import ObjectId
from dotenv import load_dotenv

from db import users

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "SMARTPANTRYSECRETKEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=1),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user["id"] = str(user["_id"])
        user["role"] = user.get("role", "user")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(current=Depends(get_current_user)):
    if current.get("role", "user") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current
