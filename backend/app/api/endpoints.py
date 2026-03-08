import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Log, Appliance, Schedule
from app.api.auth import get_current_user
from app.core.colorado_engine import evaluate_grid_status, get_colorado_time, get_demand_info
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
    duration_hours: float = 1.0

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
    duration = max(0.1, entry.duration_hours)
    
    # Full cost: energy (kWh) + demand charge if on peak
    grid_status = evaluate_grid_status(current_user.provider, current_time=exe_time)
    demand_info = get_demand_info(current_user.provider)
    energy_cost = appliance.kw_rating * duration * grid_status["rate"]
    demand_cost = 0.0
    if grid_status["status"] in ["Red", "Yellow"]:
        overage_kw = max(0.0, appliance.kw_rating - demand_info["threshold_kw"])
        demand_cost = overage_kw * demand_info["charge_per_kw"]
    cost = energy_cost + demand_cost

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
def get_status(tz: str = "America/Denver", current_user: User = Depends(get_current_user)):
    """Gets the live grid status for the user's provider, using their device timezone."""
    return evaluate_grid_status(current_user.provider, timezone=tz)

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

@router.get("/demand-stats")
def get_demand_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the user's peak concurrent kW demand this month and demand charge estimate."""
    from datetime import date
    import calendar
    
    now = get_colorado_time()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all logs this month
    logs_this_month = db.query(Log).filter(
        Log.user_id == current_user.id,
        Log.executed_time >= month_start
    ).all()
    
    demand_info = get_demand_info(current_user.provider)
    threshold_kw = demand_info["threshold_kw"]
    charge_per_kw = demand_info["charge_per_kw"]
    
    if not logs_this_month:
        return {
            "peak_kw_this_month": 0.0,
            "demand_budget_kw": threshold_kw,
            "demand_budget_pct": 0.0,
            "estimated_demand_charge": 0.0,
            "logs_count": 0,
            "provider": current_user.provider,
        }
    
    # Find peak kW in any single hour window (simplified: take max kw_rating of any single log)
    # A more accurate simulation: sum overlapping appliances within 15-min windows
    # For hackathon simplicity: group logs by hour, sum kw_ratings per hour, take max
    from collections import defaultdict
    hourly_kw: dict = defaultdict(float)
    
    for log in logs_this_month:
        appliance = db.query(Appliance).filter(Appliance.id == log.appliance_id).first()
        if appliance:
            hour_key = log.executed_time.replace(minute=0, second=0, microsecond=0)
            hourly_kw[str(hour_key)] += appliance.kw_rating
    
    peak_kw = max(hourly_kw.values()) if hourly_kw else 0.0
    overage_kw = max(0.0, peak_kw - threshold_kw)
    estimated_charge = overage_kw * charge_per_kw
    pct = min(100.0, (peak_kw / threshold_kw) * 100)
    
    return {
        "peak_kw_this_month": round(peak_kw, 2),
        "demand_budget_kw": threshold_kw,
        "demand_budget_pct": round(pct, 1),
        "estimated_demand_charge": round(estimated_charge, 2),
        "logs_count": len(logs_this_month),
        "provider": current_user.provider,
    }
