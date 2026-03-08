from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Appliance, Schedule, Log
from app.api.auth import get_current_user
from app.core.colorado_engine import evaluate_grid_status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter()

class ScheduleCreate(BaseModel):
    appliance_id: int
    scheduled_time: datetime

class ScheduleResponse(BaseModel):
    id: int
    appliance_id: int
    scheduled_time: datetime
    projected_cost: float
    status: str
    message: Optional[str] = None # For returning "Smart Savings" nudges

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ScheduleResponse])
def get_user_schedules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all schedules for the current user."""
    return db.query(Schedule).filter(Schedule.user_id == current_user.id).all()

@router.post("/", response_model=ScheduleResponse)
def create_schedule(schedule_in: ScheduleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Schedule an appliance to run. Evaluates the cost and checks if it can be smart-shifted.
    """
    appliance = db.query(Appliance).filter(Appliance.id == schedule_in.appliance_id, Appliance.user_id == current_user.id).first()
    
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
        
    # Calculate projected cost at the requested time
    # (Assuming the operation takes exactly 1 hour for simplicity of kw -> kwh conversion = kw * 1h = kWh)
    requested_status = evaluate_grid_status(current_user.provider, current_time=schedule_in.scheduled_time)
    projected_cost = appliance.kw_rating * requested_status["rate"]
    
    status_msg = "pending"
    message = None
    
    # --- SMART SHIFTING SIMULATION ---
    # If the device is smart and the requested time is Red or Yellow, shift it to Off-Peak (e.g. 11 PM)
    if appliance.is_smart_device and requested_status["status"] in ["Red", "Yellow"]:
        status_msg = "shifted"
        
        # Shift to 11 PM of the same day (naive simulation)
        optimal_time = schedule_in.scheduled_time.replace(hour=23, minute=0, second=0)
        optimal_grid = evaluate_grid_status(current_user.provider, current_time=optimal_time)
        optimal_cost = appliance.kw_rating * optimal_grid["rate"]
        
        savings = projected_cost - optimal_cost
        projected_cost = optimal_cost # Charge them the new lower cost
        schedule_in.scheduled_time = optimal_time
        
        message = f"Volt-Wise automatically shifted this task to {optimal_time.strftime('%I:%M %p')} to save you ${savings:.2f}!"

    elif not appliance.is_smart_device and requested_status["status"] in ["Red", "Yellow"]:
        # Standard warning for non-smart devices
        message = f"Warning: Peak pricing. Delay execution until tonight to save money."

    # Create Database Entry
    new_schedule = Schedule(
        user_id=current_user.id,
        appliance_id=appliance.id,
        scheduled_time=schedule_in.scheduled_time,
        projected_cost=projected_cost,
        status=status_msg
    )
    
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    # Attach the dynamic message before returning
    response_data = ScheduleResponse.model_validate(new_schedule)
    response_data.message = message
    
    return response_data
