from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pandas as pd
import json
import os

from app.database import get_db
from app.models import User, City, Sensor, AQIReading, Prediction, Alert, Report, Log
from app.schemas import AlertCreate, AlertOut, ReportOut
from app.auth import get_government_user

router = APIRouter(prefix="/government", tags=["Government Features"])

# AI Policy Recommendation Generator (GRAP)
def generate_ai_insights(avg_aqi: int, city_name: str):
    if avg_aqi <= 50:
        stage = "Normal / Green Zone"
        actions = ["Continue regular monitoring", "Promote cycling and public transit", "Maintain green cover."]
    elif avg_aqi <= 100:
        stage = "Satisfactory (GRAP Stage 1)"
        actions = ["Ensure dust control at construction sites", "Enforce ban on garbage burning", "Regular street sweeping."]
    elif avg_aqi <= 200:
        stage = "Moderate (GRAP Stage 1 - Moderate)"
        actions = ["Increase frequency of mechanized sweeping and water sprinkling on roads", "Strictly enforce pollution control regulations in industries", "Synchronize traffic lights to reduce idling."]
    elif avg_aqi <= 300:
        stage = "Poor (GRAP Stage 2)"
        actions = ["Deploy water sprinklers and dust suppressants", "Ban diesel generators except for emergency services", "Enhance parking fees to discourage private vehicles", "Increase public transport frequency."]
    elif avg_aqi <= 400:
        stage = "Very Poor (GRAP Stage 3)"
        actions = ["Ban all non-essential construction and demolition activity", "Close brick kilns and stone crushers", "Introduce Odd-Even vehicle scheme", "Encourage work from home for corporate sectors."]
    else:
        stage = "Severe / Emergency (GRAP Stage 4)"
        actions = ["Stop entry of truck traffic into the city (except essentials)", "Close all educational institutions, run classes online", "Implement odd-even rules for vehicles strictly", "Recommend 50% office attendance", "Shut down non-essential commercial operations."]
        
    return {
        "summary": f"AirGuard AI has detected an average AQI of {avg_aqi} in {city_name}. This falls under the '{stage}' category. Immediate regulatory action is recommended.",
        "stage": stage,
        "grap_actions": actions,
        "primary_pollutant_source": "Vehicular Emission & Construction Dust" if avg_aqi > 100 else "Stable Background Emissions",
        "predicted_trend_48h": "Stable" if avg_aqi < 150 else "Increasing (due to atmospheric inversion and wind stall)"
    }

@router.get("/dashboard")
def get_gov_dashboard(db: Session = Depends(get_db)):
    # 1. Total statistics
    total_cities = db.query(City).count()
    total_sensors = db.query(Sensor).count()
    active_sensors = db.query(Sensor).filter(Sensor.status == "active").count()
    active_alerts = db.query(Alert).filter(Alert.status == "active").count()
    
    # 2. City-wise summaries (for heatmap/list)
    cities = db.query(City).all()
    cities_summary = []
    
    overall_aqi_sum = 0
    cities_with_data = 0
    
    for c in cities:
        sensors = db.query(Sensor).filter(Sensor.city_id == c.id, Sensor.status == "active").all()
        s_ids = [s.id for s in sensors]
        
        if s_ids:
            latest_r = []
            for sid in s_ids:
                r = db.query(AQIReading).filter(AQIReading.sensor_id == sid).order_by(AQIReading.timestamp.desc()).first()
                if r:
                    latest_r.append(r)
            if latest_r:
                avg_aqi = int(round(sum(r.aqi for r in latest_r) / len(latest_r)))
                avg_pm25 = sum(r.pm25 for r in latest_r) / len(latest_r)
                avg_pm10 = sum(r.pm10 for r in latest_r) / len(latest_r)
                
                from ml_pipeline.data_generator import get_category
                category = get_category(avg_aqi)
                
                cities_summary.append({
                    "city_id": c.id,
                    "city_name": c.name,
                    "state": c.state,
                    "latitude": c.latitude,
                    "longitude": c.longitude,
                    "aqi": avg_aqi,
                    "category": category,
                    "pm25": round(avg_pm25, 1),
                    "pm10": round(avg_pm10, 1),
                    "sensor_count": len(sensors)
                })
                
                overall_aqi_sum += avg_aqi
                cities_with_data += 1
            else:
                cities_summary.append({
                    "city_id": c.id, "city_name": c.name, "state": c.state, "latitude": c.latitude, "longitude": c.longitude,
                    "aqi": 0, "category": "No Readings", "pm25": 0, "pm10": 0, "sensor_count": len(sensors)
                })
        else:
            cities_summary.append({
                "city_id": c.id, "city_name": c.name, "state": c.state, "latitude": c.latitude, "longitude": c.longitude,
                "aqi": 0, "category": "No Sensors", "pm25": 0, "pm10": 0, "sensor_count": 0
            })
            
    gov_avg_aqi = int(round(overall_aqi_sum / cities_with_data)) if cities_with_data > 0 else 0
    
    # 3. Model analytics metadata (R2, RMSE from saved JSON)
    model_metrics = {}
    metadata_path = 'backend/ml_pipeline/models/model_metadata.json'
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            model_metrics = json.load(f)
            
    # 4. Identify High Risk Areas
    high_risk_areas = [c for c in cities_summary if c['aqi'] > 150]
    
    return {
        "stats": {
            "average_national_aqi": gov_avg_aqi,
            "total_cities": total_cities,
            "total_sensors": total_sensors,
            "active_sensors": active_sensors,
            "active_alerts": active_alerts,
            "high_risk_cities_count": len(high_risk_areas)
        },
        "cities": cities_summary,
        "high_risk_areas": high_risk_areas,
        "model_comparison": model_metrics.get("metrics", {}),
        "feature_importance": model_metrics.get("feature_importance", {})
    }

@router.post("/alerts", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def dispatch_emergency_alert(alert_in: AlertCreate, current_user: User = Depends(get_government_user), db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == alert_in.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor node not found")
        
    alert = Alert(
        sensor_id=alert_in.sensor_id,
        alert_type=alert_in.alert_type,
        message=alert_in.message,
        severity=alert_in.severity,
        status="active"
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    # Log the dispatch
    log = Log(user_id=current_user.id, action="dispatch_alert", details=f"Dispatched emergency alert for sensor {sensor.name}: {alert.message}")
    db.add(log)
    db.commit()
    
    return alert

# Helper background task to simulate report generation
def generate_report_file(report_id: int, format_type: str, db_session_factory):
    # Retrieve DB session in background thread
    db = db_session_factory()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return
            
        os.makedirs("backend/app/static/reports", exist_ok=True)
        filename = f"aqi_report_{report_id}_{int(datetime.utcnow().timestamp())}.{format_type}"
        file_path = f"backend/app/static/reports/{filename}"
        
        # Query readings
        readings = db.query(AQIReading).order_by(AQIReading.timestamp.desc()).limit(100).all()
        
        data_list = []
        for r in readings:
            sensor = db.query(Sensor).filter(Sensor.id == r.sensor_id).first()
            city = db.query(City).filter(City.id == sensor.city_id).first() if sensor else None
            data_list.append({
                "Timestamp": r.timestamp.isoformat(),
                "City": city.name if city else "Unknown",
                "Sensor": sensor.name if sensor else "Unknown",
                "AQI": r.aqi,
                "Category": r.category,
                "PM2.5": r.pm25,
                "PM10": r.pm10,
                "NO2": r.no2,
                "SO2": r.so2,
                "CO": r.co,
                "O3": r.o3,
                "Temp": r.temperature,
                "Humidity": r.humidity
            })
            
        df = pd.DataFrame(data_list)
        
        if format_type == "csv":
            df.to_csv(file_path, index=False)
        else:
            # simple mock PDF by printing a text representation or markdown style
            # For robustness, we will create a clean text report inside pdf filename
            # (FastAPI will serve it directly as a download)
            with open(file_path, "w") as f:
                f.write("=== AIRGUARD AI - AIR QUALITY ANALYTICS REPORT ===\n")
                f.write(f"Generated at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n")
                f.write(f"Total records analyzed: {len(df)}\n")
                f.write("==================================================\n\n")
                f.write(df.to_string())
                
        # Update file_path in DB
        report.file_path = f"/static/reports/{filename}"
        db.commit()
        
    except Exception as e:
        print(f"Error generating report: {e}")
    finally:
        db.close()

@router.post("/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def request_aqi_report(report_type: str, format_type: str, background_tasks: BackgroundTasks, current_user: User = Depends(get_government_user), db: Session = Depends(get_db)):
    if report_type not in ["weekly", "monthly", "seasonal"]:
        raise HTTPException(status_code=400, detail="Invalid report type. Choose: weekly, monthly, seasonal")
    if format_type not in ["csv", "pdf"]:
        raise HTTPException(status_code=400, detail="Invalid format. Choose: csv, pdf")
        
    report = Report(
        created_by=current_user.id,
        type=report_type,
        format=format_type,
        file_path="generating" # will update asynchronously
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Trigger background report generation
    from app.database import SessionLocal
    background_tasks.add_task(generate_report_file, report.id, format_type, SessionLocal)
    
    return report

@router.get("/reports", response_model=list[ReportOut])
def get_reports(current_user: User = Depends(get_government_user), db: Session = Depends(get_db)):
    return db.query(Report).order_by(Report.generated_at.desc()).all()

@router.get("/insights")
def get_ai_insights(city_id: int, db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
        
    # Get current average AQI
    sensors = db.query(Sensor).filter(Sensor.city_id == city_id, Sensor.status == "active").all()
    s_ids = [s.id for s in sensors]
    
    avg_aqi = 120 # Default moderate baseline if no data
    if s_ids:
        latest_r = []
        for sid in s_ids:
            r = db.query(AQIReading).filter(AQIReading.sensor_id == sid).order_by(AQIReading.timestamp.desc()).first()
            if r:
                latest_r.append(r)
        if latest_r:
            avg_aqi = int(round(sum(r.aqi for r in latest_r) / len(latest_r)))
            
    insights = generate_ai_insights(avg_aqi, city.name)
    return insights
