from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.core.colorado_engine import evaluate_grid_status, get_colorado_time

router = APIRouter()

# --- MOCK DATABASE ---
# In a real app, this would be a Supabase client connection
mock_db_logs = []

class LogEntry(BaseModel):
    user_id: str
    task_name: str
    power_kw: float
    timestamp: Optional[str] = None

@router.post("/logs")
def create_log(entry: LogEntry):
    if not entry.timestamp:
        entry.timestamp = get_colorado_time().isoformat()
    
    # Store in mock DB
    log_data = entry.model_dump()
    mock_db_logs.append(log_data)
    
    # Simple Conflict Detection: Check if another high-power task was logged within the last hour
    warnings = []
    if entry.power_kw > 2.0:
        recent_logs = [l for l in mock_db_logs if l['user_id'] == entry.user_id and l != log_data]
        if recent_logs:
            warnings.append("Warning: Logging multiple high-power tasks concurrently can spike Demand Charges.")

    return {"status": "success", "data": log_data, "warnings": warnings}

@router.get("/logs")
def get_logs(user_id: str):
    user_logs = [log for log in mock_db_logs if log["user_id"] == user_id]
    return {"status": "success", "data": user_logs}

@router.get("/status")
def get_status(provider: str = "Xcel"):
    if provider.lower() not in ["xcel", "core", "united power"]:
        raise HTTPException(status_code=400, detail="Unsupported provider. Choose 'Xcel', 'CORE', or 'United Power'.")
    
    status_data = evaluate_grid_status(provider)
    return status_data

from app.core.ai_service import generate_savings_forecast
# load env vars
from dotenv import load_dotenv
load_dotenv()

@router.get("/forecast")
def get_forecast(user_id: str, provider: str = "Xcel"):
    user_logs = [log for log in mock_db_logs if log["user_id"] == user_id]
    
    forecast_text = generate_savings_forecast(user_logs, provider)
         
    return {"status": "success", "forecast": forecast_text}
