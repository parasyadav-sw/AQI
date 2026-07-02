from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pandas as pd
from typing import List, Optional

from app.database import get_db
from app.models import User, City, Sensor, AQIReading, Prediction, Alert, favorite_locations
from app.schemas import AQIReadingOut, CityOut, SensorOut, AlertOut
from app.auth import get_current_user
from ml_pipeline.predict import AQIPredictor

router = APIRouter(prefix="/citizen", tags=["Citizen Features"])
predictor = AQIPredictor()

# Personalized Health Advisory generator
def generate_health_advisory(aqi: int, category: str):
    advisories = {
        "Good": {
            "General": "Air quality is excellent. Great day for outdoor activities!",
            "Children": "Perfect outdoor play conditions.",
            "Elderly": "Safe to spend time outdoors.",
            "Pregnant Women": "Perfect conditions for outdoor walks.",
            "Asthma Patients": "No special precautions needed. Breathe easy!",
            "Heart Patients": "Safe for regular outdoor exercises.",
            "Athletes": "Ideal day for high-intensity outdoor training."
        },
        "Satisfactory": {
            "General": "Air quality is acceptable. Only highly sensitive people should consider reducing prolonged outdoor exertion.",
            "Children": "Safe for outdoor activities, monitor children with pre-existing allergies.",
            "Elderly": "Safe, but take breaks during long walks.",
            "Pregnant Women": "Normal activities can be continued.",
            "Asthma Patients": "Keep inhalers handy just in case of mild discomfort.",
            "Heart Patients": "Safe, but avoid overexertion.",
            "Athletes": "Good conditions for training, but listen to your body."
        },
        "Moderate": {
            "General": "Air quality is moderate. Sensitive people may experience minor breathing discomfort.",
            "Children": "Reduce intense outdoor games. Take indoor breaks.",
            "Elderly": "Limit heavy outdoor exercises. Rest indoors if feeling fatigued.",
            "Pregnant Women": "Take shorter walks and drink plenty of water.",
            "Asthma Patients": "Keep inhaler nearby. Reduce outdoor exposure if coughing or wheezing starts.",
            "Heart Patients": "Monitor blood pressure. Avoid sudden heavy lifting outdoors.",
            "Athletes": "Consider shorter outdoor sessions or moving cardio indoors."
        },
        "Poor": {
            "General": "Air quality is poor. Wear an N95 mask outdoors. Limit prolonged outdoor exposure.",
            "Children": "Keep children indoors. Avoid outdoor sports.",
            "Elderly": "Stay indoors. Keep windows closed to retain clean air.",
            "Pregnant Women": "Avoid going outdoors. Consider using an air purifier indoors.",
            "Asthma Patients": "High risk of attack. Take preventive medication. Stay strictly indoors.",
            "Heart Patients": "Avoid outdoor activities. Pollution can stress the cardiovascular system.",
            "Athletes": "Move all training indoors. Do not run or cycle on roads."
        },
        "Very Poor": {
            "General": "Air quality is very poor. Health alert! Avoid outdoor activities. Wear N95 masks if outdoors is mandatory.",
            "Children": "Strictly keep children indoors. Play indoor games only.",
            "Elderly": "Stay indoors. Use air purifiers if available. Seek medical help if breathing gets heavy.",
            "Pregnant Women": "Strictly stay indoors. Avoid travel unless emergency.",
            "Asthma Patients": "Critical threat. Keep emergency contact and medication active. Stay in a clean-air room.",
            "Heart Patients": "Strictly stay indoors. Avoid any physical exertion.",
            "Athletes": "Cancel all intense training. Limit exertion to light indoor stretches."
        },
        "Severe": {
            "General": "Air quality is severe/emergency. Serious health impacts even on healthy people. Remain indoors.",
            "Children": "School closure warning. Keep children in rooms with active air filtration.",
            "Elderly": "Extreme risk. Stay indoors, keep windows completely sealed. Monitor oxygen levels if needed.",
            "Pregnant Women": "Severe health risk. Stay indoors in filtered environments. Avoid any exposure.",
            "Asthma Patients": "Extreme health hazard. Ensure oxygen/purifier and emergency medicines are ready. Seek immediate hospital care if needed.",
            "Heart Patients": "Extreme risk. Do not exert. Stay indoors and seek immediate medical assistance for chest pain.",
            "Athletes": "Rest completely. Avoid any physical workouts."
        }
    }
    
    cat_key = category if category in advisories else "Moderate"
    return advisories[cat_key]

@router.get("/cities", response_model=List[CityOut])
def get_cities(db: Session = Depends(get_db)):
    return db.query(City).all()

@router.get("/sensors", response_model=List[SensorOut])
def get_sensors(city_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Sensor)
    if city_id:
        query = query.filter(Sensor.city_id == city_id)
    return query.all()

@router.get("/dashboard")
def get_citizen_dashboard(city_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Fetch City details
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
        
    # 2. Fetch active sensors in the city
    sensors = db.query(Sensor).filter(Sensor.city_id == city_id, Sensor.status == "active").all()
    sensor_ids = [s.id for s in sensors]
    
    if not sensor_ids:
        return {
            "city": city.name,
            "status": "No active sensors found in this city",
            "current_aqi": 0,
            "category": "Unknown",
            "readings": {},
            "predictions": {"24h": 0, "48h": 0, "72h": 0},
            "advisories": {},
            "trends": [],
            "hotspots": []
        }
        
    # 3. Get the latest reading (average across all city sensors)
    latest_readings = []
    for sid in sensor_ids:
        reading = db.query(AQIReading).filter(AQIReading.sensor_id == sid).order_by(AQIReading.timestamp.desc()).first()
        if reading:
            latest_readings.append(reading)
            
    if not latest_readings:
        return {
            "city": city.name,
            "status": "No readings recorded yet",
            "current_aqi": 0,
            "category": "Unknown",
            "readings": {},
            "predictions": {"24h": 0, "48h": 0, "72h": 0},
            "advisories": {},
            "trends": [],
            "hotspots": []
        }
        
    # Compute averages of pollutants and weather
    avg_pm25 = sum(r.pm25 for r in latest_readings) / len(latest_readings)
    avg_pm10 = sum(r.pm10 for r in latest_readings) / len(latest_readings)
    avg_no2 = sum(r.no2 for r in latest_readings) / len(latest_readings)
    avg_so2 = sum(r.so2 for r in latest_readings) / len(latest_readings)
    avg_co = sum(r.co for r in latest_readings) / len(latest_readings)
    avg_o3 = sum(r.o3 for r in latest_readings) / len(latest_readings)
    avg_temp = sum(r.temperature for r in latest_readings) / len(latest_readings)
    avg_humidity = sum(r.humidity for r in latest_readings) / len(latest_readings)
    avg_wind = sum(r.wind_speed for r in latest_readings) / len(latest_readings)
    avg_pressure = sum(r.pressure for r in latest_readings) / len(latest_readings)
    avg_rainfall = sum(r.rainfall for r in latest_readings) / len(latest_readings)
    avg_aqi = int(round(sum(r.aqi for r in latest_readings) / len(latest_readings)))
    
    # Category
    from ml_pipeline.data_generator import get_category
    category = get_category(avg_aqi)
    
    # 4. ML Predictions
    # Gather recent 24-hour history of AQI in this city for lag features
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    history_readings = db.query(AQIReading)\
        .filter(AQIReading.sensor_id.in_(sensor_ids), AQIReading.timestamp >= twenty_four_hours_ago)\
        .order_by(AQIReading.timestamp.asc()).all()
        
    history_list = []
    for h in history_readings:
        history_list.append({
            'Timestamp': h.timestamp.isoformat(),
            'AQI': h.aqi,
            'PM2.5': h.pm25,
            'Temperature': h.temperature
        })
        
    current_data_payload = {
        'PM2.5': avg_pm25, 'PM10': avg_pm10, 'NO2': avg_no2, 'SO2': avg_so2, 'CO': avg_co, 'O3': avg_o3,
        'Temperature': avg_temp, 'Humidity': avg_humidity, 'Wind Speed': avg_wind, 'Pressure': avg_pressure, 'Rainfall': avg_rainfall,
        'City': city.name, 'AQI': avg_aqi, 'Timestamp': datetime.utcnow().isoformat()
    }
    
    pred_res = predictor.make_prediction(current_data_payload, history=history_list)
    
    # 5. Smart Health Advisories
    health_advisory = generate_health_advisory(avg_aqi, category)
    
    # 6. Weekly trends (Recharts)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    trend_data = db.query(
            AQIReading.timestamp, 
            AQIReading.aqi, 
            AQIReading.pm25, 
            AQIReading.pm10
        ).filter(AQIReading.sensor_id.in_(sensor_ids), AQIReading.timestamp >= seven_days_ago)\
        .order_by(AQIReading.timestamp.asc()).all()
        
    # Group by day and average
    trends_df = pd.DataFrame(trend_data, columns=['timestamp', 'aqi', 'pm25', 'pm10'])
    trends_list = []
    if not trends_df.empty:
        trends_df['day'] = pd.to_datetime(trends_df['timestamp']).dt.strftime('%a')
        daily_trends = trends_df.groupby('day')[['aqi', 'pm25', 'pm10']].mean().reset_index()
        # Sort days of week correctly by using categorical sort
        days_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        daily_trends['day'] = pd.Categorical(daily_trends['day'], categories=days_order, ordered=True)
        daily_trends = daily_trends.sort_values('day')
        trends_list = daily_trends.to_dict(orient='records')
        
    # 7. Hotspots (Sensors in the city with AQI > 150)
    hotspots = []
    for s in sensors:
        last_r = db.query(AQIReading).filter(AQIReading.sensor_id == s.id).order_by(AQIReading.timestamp.desc()).first()
        if last_r and last_r.aqi > 150:
            hotspots.append({
                "sensor_name": s.name,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "aqi": last_r.aqi,
                "category": last_r.category
            })
            
    # 8. Active Emergency Alerts
    recent_alerts = db.query(Alert).filter(Alert.sensor_id.in_(sensor_ids), Alert.status == "active").order_by(Alert.timestamp.desc()).all()
    alerts_list = [
        {
            "id": a.id,
            "sensor": db.query(Sensor).filter(Sensor.id == a.sensor_id).first().name,
            "alert_type": a.alert_type,
            "message": a.message,
            "severity": a.severity,
            "timestamp": a.timestamp.isoformat()
        } for a in recent_alerts
    ]
    
    # 9. Check if current city is user's favorite
    is_favorite = db.query(favorite_locations).filter(
        favorite_locations.c.user_id == current_user.id,
        favorite_locations.c.city_id == city_id
    ).first() is not None
    
    return {
        "city_id": city.id,
        "city_name": city.name,
        "state": city.state,
        "latitude": city.latitude,
        "longitude": city.longitude,
        "is_favorite": is_favorite,
        "current_aqi": avg_aqi,
        "category": category,
        "weather": {
            "temperature": round(avg_temp, 1),
            "humidity": round(avg_humidity, 1),
            "wind_speed": round(avg_wind, 1),
            "pressure": round(avg_pressure, 1),
            "rainfall": round(avg_rainfall, 2)
        },
        "pollutants": {
            "PM25": round(avg_pm25, 1),
            "PM10": round(avg_pm10, 1),
            "NO2": round(avg_no2, 1),
            "SO2": round(avg_so2, 1),
            "CO": round(avg_co, 2),
            "O3": round(avg_o3, 1)
        },
        "predictions": pred_res.get("predictions", {"24h": avg_aqi, "48h": avg_aqi, "72h": avg_aqi}),
        "explainability": pred_res.get("explainability", []),
        "advisories": health_advisory,
        "trends": trends_list,
        "hotspots": hotspots,
        "alerts": alerts_list
    }

@router.get("/favorites", response_model=List[CityOut])
def get_favorite_locations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    return user.favorites

@router.post("/favorites/{city_id}")
def add_favorite_location(city_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
        
    user = db.query(User).filter(User.id == current_user.id).first()
    if city in user.favorites:
        return {"message": "City already in favorites"}
        
    user.favorites.append(city)
    db.commit()
    return {"message": f"Added {city.name} to favorites"}

@router.delete("/favorites/{city_id}")
def remove_favorite_location(city_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
        
    user = db.query(User).filter(User.id == current_user.id).first()
    if city not in user.favorites:
        raise HTTPException(status_code=400, detail="City not in favorites")
        
    user.favorites.remove(city)
    db.commit()
    return {"message": f"Removed {city.name} from favorites"}
