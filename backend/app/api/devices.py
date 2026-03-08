from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Appliance
from app.api.auth import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ApplianceCreate(BaseModel):
    name: str
    kw_rating: float
    is_smart_device: bool = False

class ApplianceResponse(BaseModel):
    id: int
    name: str
    kw_rating: float
    is_smart_device: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ApplianceResponse])
def get_user_appliances(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all appliances registered to the current user."""
    return db.query(Appliance).filter(Appliance.user_id == current_user.id).all()

@router.post("/", response_model=ApplianceResponse)
def add_appliance(appliance: ApplianceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Register a new appliance for the user."""
    db_appliance = Appliance(**appliance.model_dump(), user_id=current_user.id)
    db.add(db_appliance)
    db.commit()
    db.refresh(db_appliance)
    return db_appliance

@router.post("/{appliance_id}/connect")
def connect_smart_device(appliance_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Simulates connecting a smart device to Volt-Wise."""
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id, Appliance.user_id == current_user.id).first()
    
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
        
    appliance.is_smart_device = True
    db.commit()
    
    return {"status": "success", "message": f"Successfully connected {appliance.name} to Volt-Wise Smart Home System."}
