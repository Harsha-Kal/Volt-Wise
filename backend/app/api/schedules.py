from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Appliance, Schedule, Log
from app.api.auth import get_current_user
from app.core.colorado_engine import evaluate_grid_status, get_demand_info
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter()

class ScheduleCreate(BaseModel):
    appliance_id: int
    scheduled_time: datetime
    duration_hours: float = 1.0
    timezone: str = "America/Denver"  # IANA timezone from the user's device

class ScheduleResponse(BaseModel):
    id: int
    appliance_id: int
    scheduled_time: datetime
    projected_cost: float
    status: str
    message: Optional[str] = None
    energy_cost: Optional[float] = None
    demand_cost: Optional[float] = None
    duration_hours: Optional[float] = None
    rate_per_kwh: Optional[float] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ScheduleResponse])
def get_user_schedules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all schedules for the current user."""
    return db.query(Schedule).filter(Schedule.user_id == current_user.id).all()

@router.post("/", response_model=ScheduleResponse)
def create_schedule(schedule_in: ScheduleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Schedule an appliance to run. Calculates full cost: energy (kWh) + demand charges.
    """
    appliance = db.query(Appliance).filter(
        Appliance.id == schedule_in.appliance_id,
        Appliance.user_id == current_user.id
    ).first()
    
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    
    duration = max(0.1, schedule_in.duration_hours)
    requested_status = evaluate_grid_status(
        current_user.provider,
        current_time=schedule_in.scheduled_time,
        timezone=schedule_in.timezone
    )
    demand_info = get_demand_info(current_user.provider)
    
    # ---- Energy cost: kW × hours × $/kWh ----
    energy_cost = appliance.kw_rating * duration * requested_status["rate"]
    
    # ---- Demand charge: only during peak, only if kW exceeds threshold ----
    # Demand charge = (kW_over_threshold) × $/kW (monthly, prorated per use)
    demand_cost = 0.0
    if requested_status["status"] in ["Red", "Yellow"]:
        overage_kw = max(0.0, appliance.kw_rating - demand_info["threshold_kw"])
        demand_cost = overage_kw * demand_info["charge_per_kw"]
    
    projected_cost = energy_cost + demand_cost
    
    status_msg = "pending"
    message = None
    final_energy_cost = energy_cost
    final_demand_cost = demand_cost

    # --- SMART SHIFTING SIMULATION ---
    if appliance.is_smart_device and requested_status["status"] in ["Red", "Yellow"]:
        status_msg = "shifted"
        optimal_time = schedule_in.scheduled_time.replace(hour=23, minute=0, second=0)
        optimal_grid = evaluate_grid_status(
            current_user.provider,
            current_time=optimal_time,
            timezone=schedule_in.timezone
        )
        final_energy_cost = appliance.kw_rating * duration * optimal_grid["rate"]
        final_demand_cost = 0.0  # off-peak = no demand charge
        savings = projected_cost - (final_energy_cost + final_demand_cost)
        projected_cost = final_energy_cost + final_demand_cost
        schedule_in.scheduled_time = optimal_time
        message = (
            f"Volt-Wise shifted this to {optimal_time.strftime('%I:%M %p')} (off-peak) "
            f"to save you ${savings:.2f}! "
            f"Energy: ${final_energy_cost:.2f}, Demand: $0.00"
        )

    elif not appliance.is_smart_device and requested_status["status"] in ["Red", "Yellow"]:
        charge_str = f" + ${demand_cost:.2f} demand charge" if demand_cost > 0 else ""
        message = (
            f"Peak pricing active. Energy cost: ${energy_cost:.2f}{charge_str}. "
            f"Delay to off-peak to save money."
        )

    new_schedule = Schedule(
        user_id=current_user.id,
        appliance_id=appliance.id,
        scheduled_time=schedule_in.scheduled_time,
        projected_cost=round(projected_cost, 4),
        status=status_msg
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    response_data = ScheduleResponse.model_validate(new_schedule)
    response_data.message = message
    response_data.energy_cost = round(final_energy_cost, 4)
    response_data.demand_cost = round(final_demand_cost, 4)
    response_data.duration_hours = duration
    response_data.rate_per_kwh = optimal_grid["rate"] if status_msg == "shifted" else requested_status["rate"]
    return response_data
