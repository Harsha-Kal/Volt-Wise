from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.database import Base, engine
from app.db import models

# Routers
from app.api.endpoints import router as api_router
from app.api.auth import router as auth_router
from app.api.devices import router as devices_router
from app.api.schedules import router as schedules_router

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Volt-Wise API v2")

import traceback
import logging
logger = logging.getLogger("uvicorn.error")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception:\n" + traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": str(exc)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://10.0.0.90:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(devices_router, prefix="/api/devices", tags=["devices"])
app.include_router(schedules_router, prefix="/api/schedules", tags=["schedules"])
app.include_router(api_router, prefix="/api", tags=["core"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Volt-Wise API v2 with Authentication and SQLite"}
