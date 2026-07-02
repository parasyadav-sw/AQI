from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any

from app.database import get_db
from app.models import User, City, Sensor, AQIReading, Log
from app.schemas import UserOut, CityCreate, CityOut, SensorCreate, SensorOut, SensorUpdate, LogOut
from app.auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin Features"])

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, role: str, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    if role not in ["citizen", "government", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Choose: citizen, government, admin")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = role
    db.commit()
    db.refresh(user)
    
    # Log action
    log = Log(user_id=current_user.id, action="update_user_role", details=f"Changed role of user {user.email} to {role}")
    db.add(log)
    db.commit()
    
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")
        
    db.delete(user)
    db.commit()
    
    # Log action
    log = Log(user_id=current_user.id, action="delete_user", details=f"Deleted user: {user.email}")
    db.add(log)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/cities", response_model=CityOut, status_code=status.HTTP_201_CREATED)
def add_city(city_in: CityCreate, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    existing = db.query(City).filter(City.name == city_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="City name already exists")
        
    city = City(
        name=city_in.name,
        state=city_in.state,
        latitude=city_in.latitude,
        longitude=city_in.longitude
    )
    db.add(city)
    db.commit()
    db.refresh(city)
    
    # Log action
    log = Log(user_id=current_user.id, action="add_city", details=f"Added new city: {city.name}")
    db.add(log)
    db.commit()
    
    return city

@router.post("/sensors", response_model=SensorOut, status_code=status.HTTP_201_CREATED)
def deploy_sensor(sensor_in: SensorCreate, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == sensor_in.city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
        
    sensor = Sensor(
        name=sensor_in.name,
        city_id=sensor_in.city_id,
        latitude=sensor_in.latitude,
        longitude=sensor_in.longitude,
        status="active"
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    
    # Log action
    log = Log(user_id=current_user.id, action="deploy_sensor", details=f"Deployed new sensor {sensor.name} in {city.name}")
    db.add(log)
    db.commit()
    
    return sensor

@router.put("/sensors/{sensor_id}", response_model=SensorOut)
def update_sensor(sensor_id: int, sensor_in: SensorUpdate, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
        
    update_data = sensor_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sensor, field, value)
        
    db.commit()
    db.refresh(sensor)
    
    # Log action
    log = Log(user_id=current_user.id, action="update_sensor", details=f"Updated sensor {sensor.name} (status set to: {sensor.status})")
    db.add(log)
    db.commit()
    
    return sensor

@router.delete("/sensors/{sensor_id}")
def decommission_sensor(sensor_id: int, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
        
    db.delete(sensor)
    db.commit()
    
    # Log action
    log = Log(user_id=current_user.id, action="delete_sensor", details=f"Decommissioned sensor: {sensor.name}")
    db.add(log)
    db.commit()
    
    return {"message": "Sensor node decommissioned successfully"}

@router.get("/logs", response_model=List[LogOut])
def read_system_logs(db: Session = Depends(get_db)):
    return db.query(Log).order_by(Log.timestamp.desc()).limit(100).all()

@router.get("/analytics")
def get_system_analytics(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    citizens = db.query(User).filter(User.role == "citizen").count()
    officers = db.query(User).filter(User.role == "government").count()
    admins = db.query(User).filter(User.role == "admin").count()
    
    readings_count = db.query(AQIReading).count()
    
    return {
        "users": {
            "total": total_users,
            "citizens": citizens,
            "officers": officers,
            "admins": admins
        },
        "database": {
            "aqi_readings": readings_count,
            "sensors": db.query(Sensor).count(),
            "cities": db.query(City).count()
        }
    }

@router.post("/backup")
def trigger_database_backup(current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Simulates a SQLite/PostgreSQL dump
    # We will log the backup trigger
    log = Log(user_id=current_user.id, action="database_backup", details="Initiated full database backup.")
    db.add(log)
    db.commit()
    
    return {
        "status": "success",
        "message": "Database backup completed successfully.",
        "file_name": f"airguard_backup_{int(datetime.utcnow().timestamp())}.sql",
        "file_size_kb": 128.5
    }
