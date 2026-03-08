import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Log, Appliance, Schedule
from app.api.auth import get_current_user
from app.core.colorado_engine import evaluate_grid_status, get_colorado_time
from app.core.ai_service import generate_savings_forecast
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(dotenv_path=env_path)

router = APIRouter()

class LogCreate(BaseModel):
    appliance_id: int
    executed_time: Optional[datetime] = None

class LogResponse(BaseModel):
    id: int
    appliance_id: int
    executed_time: datetime
    cost: float

    class Config:
        from_attributes = True

@router.post("/logs", response_model=LogResponse)
def create_log(entry: LogCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Execute a task right now and log it historically. Calculates actual cost."""
    
    # Ensure they own the appliance
    appliance = db.query(Appliance).filter(Appliance.id == entry.appliance_id, Appliance.user_id == current_user.id).first()
    if not appliance:
         raise HTTPException(status_code=404, detail="Appliance not found")

    exe_time = entry.executed_time or get_colorado_time()
    
    # Calculate actual cost run right now
    grid_status = evaluate_grid_status(current_user.provider, current_time=exe_time)
    cost = appliance.kw_rating * grid_status["rate"]

    new_log = Log(
        user_id=current_user.id,
        appliance_id=appliance.id,
        executed_time=exe_time,
        cost=cost
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return new_log

@router.get("/logs", response_model=List[LogResponse])
def get_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Log).filter(Log.user_id == current_user.id).order_by(Log.executed_time.desc()).all()

@router.get("/status")
def get_status(current_user: User = Depends(get_current_user)):
    """Gets the live status based on the *authenticated user's* chosen provider."""
    return evaluate_grid_status(current_user.provider)

@router.get("/forecast")
def get_forecast(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generates AI savings forecast considering both past logs and future schedules"""
    
    # Grab recent logs and active schedules
    logs = db.query(Log).filter(Log.user_id == current_user.id).order_by(Log.executed_time.desc()).limit(10).all()
    schedules = db.query(Schedule).filter(Schedule.user_id == current_user.id, Schedule.status == "pending").all()
    
    # Format for Gemini
    context_data = []
    for l in logs:
        appliance = db.query(Appliance).filter(Appliance.id == l.appliance_id).first()
        context_data.append({"type": "Past Action", "appliance": appliance.name if appliance else "Unknown", "time": str(l.executed_time), "cost": l.cost})
        
    for s in schedules:
        appliance = db.query(Appliance).filter(Appliance.id == s.appliance_id).first()
        context_data.append({"type": "Planned Action", "appliance": appliance.name if appliance else "Unknown", "scheduled_time": str(s.scheduled_time), "projected_cost": s.projected_cost})
    
    if not context_data:
         return {"status": "success", "forecast": "No logs yet. Start registering appliances and scheduling usage to get AI insights!"}
         
    forecast_text = generate_savings_forecast(context_data, current_user.provider)
         
    return {"status": "success", "forecast": forecast_text}
