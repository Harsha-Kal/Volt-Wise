from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(devices_router, prefix="/api/devices", tags=["devices"])
app.include_router(schedules_router, prefix="/api/schedules", tags=["schedules"])
app.include_router(api_router, prefix="/api", tags=["core"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Volt-Wise API v2 with Authentication and SQLite"}
