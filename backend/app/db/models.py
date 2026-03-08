from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    provider = Column(String, default="Xcel")
    appliances = relationship("Appliance", back_populates="owner")
    schedules = relationship("Schedule", back_populates="owner")
    logs = relationship("Log", back_populates="owner")

class Appliance(Base):
    __tablename__ = "appliances"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    kw_rating = Column(Float)
    is_smart_device = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="appliances")
    schedules = relationship("Schedule", back_populates="appliance")
    logs = relationship("Log", back_populates="appliance")

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    appliance_id = Column(Integer, ForeignKey("appliances.id"))
    scheduled_time = Column(DateTime)
    projected_cost = Column(Float)
    status = Column(String, default="pending") # pending, completed, shifted
    
    owner = relationship("User", back_populates="schedules")
    appliance = relationship("Appliance", back_populates="schedules")

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    appliance_id = Column(Integer, ForeignKey("appliances.id"))
    executed_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    cost = Column(Float)
    
    owner = relationship("User", back_populates="logs")
    appliance = relationship("Appliance", back_populates="logs")
