from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==========================
# AUTHENTICATION SCHEMAS
# ==========================
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    language: str = "en"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# ==========================
# CITY & SENSOR SCHEMAS
# ==========================
class CityBase(BaseModel):
    name: str
    state: str
    latitude: float
    longitude: float

class CityCreate(CityBase):
    pass

class CityOut(CityBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SensorBase(BaseModel):
    name: str
    city_id: int
    latitude: float
    longitude: float

class SensorCreate(SensorBase):
    pass

class SensorUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None # active, inactive, maintenance
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SensorOut(SensorBase):
    id: int
    status: str
    last_reading_time: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==========================
# AQI & READINGS SCHEMAS
# ==========================
class AQIReadingBase(BaseModel):
    pm25: float = Field(..., alias="PM2.5")
    pm10: float = Field(..., alias="PM10")
    no2: float = Field(..., alias="NO2")
    so2: float = Field(..., alias="SO2")
    co: float = Field(..., alias="CO")
    o3: float = Field(..., alias="O3")
    temperature: float
    humidity: float
    wind_speed: float
    pressure: float
    rainfall: float = 0.0

    class Config:
        populate_by_name = True

class AQIReadingCreate(AQIReadingBase):
    sensor_id: int
    timestamp: Optional[datetime] = None

class AQIReadingOut(AQIReadingBase):
    id: int
    sensor_id: int
    aqi: int
    category: str
    timestamp: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# ==========================
# PREDICTION & ALERTS
# ==========================
class PredictionOut(BaseModel):
    id: int
    sensor_id: int
    predict_time: datetime
    aqi_24h: int
    aqi_48h: int
    aqi_72h: int
    model_used: str
    metrics: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    sensor_id: int
    alert_type: str
    message: str
    severity: str

class AlertCreate(AlertBase):
    pass

class AlertOut(AlertBase):
    id: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

# ==========================
# SYSTEM ANALYTICS & LOGS
# ==========================
class LogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class ReportOut(BaseModel):
    id: int
    created_by: Optional[int]
    type: str
    format: str
    file_path: str
    generated_at: datetime

    class Config:
        from_attributes = True

# ==========================
# CHATBOT & BONUS SCHEMAS
# ==========================
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = [] # list of {"role": "user"/"assistant", "content": "..."}
    language: str = "en" # en, hi, mr

class ChatResponse(BaseModel):
    response: str
    language: str

class CarbonCalculatorRequest(BaseModel):
    vehicle_type: str # petrol_car, diesel_car, electric_car, motorbike, bus, train
    distance_km: float
    passengers: int = 1

class CarbonCalculatorResponse(BaseModel):
    co2_emitted_kg: float
    comparison_trees_absorbed_daily: float
    carbon_rating: str # High, Moderate, Low
    green_tips: List[str]

class RouteRecommendationRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    mode: str = "walking" # walking, cycling, driving

class RoutePoint(BaseModel):
    lat: float
    lng: float
    aqi: int
    category: str

class RouteRecommendationResponse(BaseModel):
    route_name: str
    clean_route_points: List[RoutePoint]
    average_aqi: float
    health_safety_index: float # 0 to 100
    alternative_points: List[RoutePoint]
    alternative_average_aqi: float
