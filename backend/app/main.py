from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os

from app.config import settings
from app.database import engine, Base, get_db
from app.models import User, City, Sensor, AQIReading
from app.auth import get_password_hash
from app.routers import auth, citizen, government, admin, ml, chatbot

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder for downloading reports
os.makedirs("backend/app/static/reports", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/app/static"), name="static")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(citizen.router, prefix=settings.API_V1_STR)
app.include_router(government.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(chatbot.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "api_v1_prefix": settings.API_V1_STR
    }

# ==========================
# DATABASE STARTUP SEEDER
# ==========================
@app.on_event("startup")
def seed_database():
    db = next(get_db())
    try:
        # 1. Seed Users if empty
        if db.query(User).count() == 0:
            print("Seeding initial users...")
            admin_user = User(
                email=settings.FIRST_SUPERUSER_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                name="System Administrator",
                phone="9876543210",
                role="admin",
                language="en",
                is_verified=True
            )
            gov_user = User(
                email="officer@airguard.gov.in",
                hashed_password=get_password_hash("Officer@12345"),
                name="S.K. Mishra (Pollution Officer)",
                phone="9876543211",
                role="government",
                language="en",
                is_verified=True
            )
            citizen_user = User(
                email="citizen@gmail.com",
                hashed_password=get_password_hash("Citizen@12345"),
                name="Amit Sharma",
                phone="9876543212",
                role="citizen",
                language="en",
                is_verified=True
            )
            db.add_all([admin_user, gov_user, citizen_user])
            db.commit()
            
        # 2. Seed Cities if empty
        if db.query(City).count() == 0:
            print("Seeding initial cities...")
            delhi = City(name="Delhi", state="NCR", latitude=28.6139, longitude=77.2090)
            mumbai = City(name="Mumbai", state="Maharashtra", latitude=19.0760, longitude=72.8777)
            pune = City(name="Pune", state="Maharashtra", latitude=18.5204, longitude=73.8567)
            db.add_all([delhi, mumbai, pune])
            db.commit()
            
        # 3. Seed Sensors if empty
        if db.query(Sensor).count() == 0:
            print("Seeding initial sensors...")
            delhi = db.query(City).filter(City.name == "Delhi").first()
            mumbai = db.query(City).filter(City.name == "Mumbai").first()
            pune = db.query(City).filter(City.name == "Pune").first()
            
            s1 = Sensor(name="Delhi Central (R.K. Puram)", city_id=delhi.id, latitude=28.5648, longitude=77.1887)
            s2 = Sensor(name="Delhi North (Wazirpur)", city_id=delhi.id, latitude=28.6994, longitude=77.1656)
            s3 = Sensor(name="Delhi Airport (IGI T3)", city_id=delhi.id, latitude=28.5562, longitude=77.1000)
            
            s4 = Sensor(name="Mumbai South (Colaba)", city_id=mumbai.id, latitude=18.9067, longitude=72.8147)
            s5 = Sensor(name="Mumbai West (Bandra)", city_id=mumbai.id, latitude=19.0596, longitude=72.8295)
            
            s6 = Sensor(name="Pune Central (Shivajinagar)", city_id=pune.id, latitude=18.5312, longitude=73.8445)
            s7 = Sensor(name="Pune West (Kothrud)", city_id=pune.id, latitude=18.5074, longitude=73.8077)
            
            db.add_all([s1, s2, s3, s4, s5, s6, s7])
            db.commit()
            
        # 4. Seed 7 days of historical readings if empty
        if db.query(AQIReading).count() == 0:
            print("Seeding 7 days of historical readings (to populate charts)...")
            sensors = db.query(Sensor).all()
            from ml_pipeline.data_generator import calculate_aqi, get_category
            import random
            
            # Base ranges for city parameters
            base_ranges = {
                "delhi": {"pm25": 85.0, "temp": 18.0, "humid": 80.0},
                "mumbai": {"pm25": 38.0, "temp": 28.0, "humid": 85.0},
                "pune": {"pm25": 42.0, "temp": 24.0, "humid": 60.0}
            }
            
            now = datetime.utcnow()
            readings_list = []
            
            for s in sensors:
                city_name = s.city.name.lower()
                params = base_ranges.get(city_name, {"pm25": 50.0, "temp": 25.0, "humid": 70.0})
                
                # Update last reading time
                s.last_reading_time = now
                
                for h in range(168, -1, -1): # 7 days hourly
                    ts = now - timedelta(hours=h)
                    
                    # Create seasonal/diurnal variability
                    hour = ts.hour
                    traffic_factor = 1.0 + 0.6 * (1 if (8 <= hour <= 10 or 18 <= hour <= 21) else 0)
                    
                    pm25_val = round(params["pm25"] * traffic_factor * random.uniform(0.7, 1.4), 1)
                    pm10_val = round(pm25_val * random.uniform(1.4, 1.8), 1)
                    no2_val = round(25.0 * traffic_factor * random.uniform(0.8, 1.2), 1)
                    so2_val = round(10.0 * random.uniform(0.8, 1.2), 1)
                    co_val = round(0.8 * traffic_factor * random.uniform(0.7, 1.3), 2)
                    o3_val = round(35.0 * random.uniform(0.6, 1.4), 1)
                    
                    temp_val = round(params["temp"] + 4 * (1 if (11 <= hour <= 16) else -1) + random.uniform(-1, 1), 1)
                    humid_val = round(params["humid"] - 10 * (1 if (11 <= hour <= 16) else -1) + random.uniform(-3, 3), 1)
                    humid_val = min(100.0, max(10.0, humid_val))
                    
                    wind_val = round(random.uniform(2.0, 12.0), 1)
                    pressure_val = round(1010.0 + random.uniform(-3, 3), 1)
                    rainfall_val = round(random.expovariate(1.0) if random.random() < 0.05 else 0.0, 2)
                    
                    row = {
                        'PM2.5': pm25_val, 'PM10': pm10_val, 'NO2': no2_val, 
                        'SO2': so2_val, 'CO': co_val, 'O3': o3_val
                    }
                    aqi_val = calculate_aqi(row)
                    cat_val = get_category(aqi_val)
                    
                    r = AQIReading(
                        sensor_id=s.id,
                        pm25=pm25_val,
                        pm10=pm10_val,
                        no2=no2_val,
                        so2=so2_val,
                        co=co_val,
                        o3=o3_val,
                        temperature=temp_val,
                        humidity=humid_val,
                        wind_speed=wind_val,
                        pressure=pressure_val,
                        rainfall=rainfall_val,
                        aqi=aqi_val,
                        category=cat_val,
                        timestamp=ts
                    )
                    readings_list.append(r)
            
            db.add_all(readings_list)
            db.commit()
            print("Successfully seeded 7 days of sensor readings.")
            
        # 5. Check if ML models are trained. If not, trigger quick initial training!
        model_path = 'ml_pipeline/models/best_model.joblib'
        if not os.path.exists(model_path):
            print("Model files not found. Running initial ML training sequence...")
            # Run generator first to have full dataset
            csv_path = 'ml_pipeline/data/historical_aqi.csv'
            if not os.path.exists(csv_path):
                from ml_pipeline.data_generator import generate_all_datasets
                generate_all_datasets()
            from ml_pipeline.train import train_and_evaluate
            train_and_evaluate()
            
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
