from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Association Table for User's Favorite Locations
favorite_locations = Table(
    'favorite_locations',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('city_id', Integer, ForeignKey('cities.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, default="citizen", nullable=False) # citizen, government, admin
    language = Column(String, default="en", nullable=False) # en, hi, mr
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    reports = relationship("Report", back_populates="creator")
    logs = relationship("Log", back_populates="user")
    favorites = relationship("City", secondary=favorite_locations, back_populates="favorited_by")

class City(Base):
    __tablename__ = "cities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    state = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    sensors = relationship("Sensor", back_populates="city", cascade="all, delete-orphan")
    favorited_by = relationship("User", secondary=favorite_locations, back_populates="favorites")

class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="active", nullable=False) # active, inactive, maintenance
    last_reading_time = Column(DateTime, nullable=True)
    
    # Relationships
    city = relationship("City", back_populates="sensors")
    readings = relationship("AQIReading", back_populates="sensor", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="sensor", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="sensor", cascade="all, delete-orphan")

class AQIReading(Base):
    __tablename__ = "aqi_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id", ondelete="CASCADE"), nullable=False)
    pm25 = Column(Float, nullable=False)
    pm10 = Column(Float, nullable=False)
    no2 = Column(Float, nullable=False)
    so2 = Column(Float, nullable=False)
    co = Column(Float, nullable=False)
    o3 = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    wind_speed = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    rainfall = Column(Float, default=0.0, nullable=False)
    aqi = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    sensor = relationship("Sensor", back_populates="readings")

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id", ondelete="CASCADE"), nullable=False)
    predict_time = Column(DateTime, nullable=False)
    aqi_24h = Column(Integer, nullable=False)
    aqi_48h = Column(Integer, nullable=False)
    aqi_72h = Column(Integer, nullable=False)
    model_used = Column(String, nullable=False)
    metrics = Column(JSON, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    sensor = relationship("Sensor", back_populates="predictions")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String, nullable=False) # poor_aqi, severe_aqi, sudden_spike, rain_improvement
    message = Column(Text, nullable=False)
    severity = Column(String, default="warning", nullable=False) # info, warning, critical
    status = Column(String, default="active", nullable=False) # active, resolved
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    sensor = relationship("Sensor", back_populates="alerts")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String, nullable=False) # weekly, monthly, seasonal
    format = Column(String, nullable=False) # pdf, csv
    file_path = Column(String, nullable=False)
    generated_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    creator = relationship("User", back_populates="reports")

class Log(Base):
    __tablename__ = "logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="logs")
