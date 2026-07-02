import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# CPCB AQI Calculation breaking points
# format: (low_pollutant, high_pollutant, low_aqi, high_aqi)
BREAKPOINTS = {
    'PM2.5': [
        (0.0, 30.0, 0.0, 50.0),
        (30.1, 60.0, 50.1, 100.0),
        (60.1, 90.0, 100.1, 200.0),
        (90.1, 120.0, 200.1, 300.0),
        (120.1, 250.0, 300.1, 400.0),
        (250.1, 500.0, 400.1, 500.0)
    ],
    'PM10': [
        (0.0, 50.0, 0.0, 50.0),
        (50.1, 100.0, 50.1, 100.0),
        (100.1, 250.0, 100.1, 200.0),
        (250.1, 350.0, 200.1, 300.0),
        (350.1, 430.0, 300.1, 400.0),
        (430.1, 850.0, 400.1, 500.0)
    ],
    'NO2': [
        (0.0, 40.0, 0.0, 50.0),
        (40.1, 80.0, 50.1, 100.0),
        (80.1, 180.0, 100.1, 200.0),
        (180.1, 280.0, 200.1, 300.0),
        (280.1, 400.0, 300.1, 400.0),
        (400.1, 1000.0, 400.1, 500.0)
    ],
    'SO2': [
        (0.0, 40.0, 0.0, 50.0),
        (40.1, 80.0, 50.1, 100.0),
        (80.1, 380.0, 100.1, 200.0),
        (380.1, 800.0, 200.1, 300.0),
        (800.1, 1600.0, 300.1, 400.0),
        (1600.1, 3000.0, 400.1, 500.0)
    ],
    'CO': [
        (0.0, 1.0, 0.0, 50.0),
        (1.01, 2.0, 50.1, 100.0),
        (2.01, 10.0, 100.1, 200.0),
        (10.01, 17.0, 200.1, 300.0),
        (17.01, 34.0, 300.1, 400.0),
        (34.01, 68.0, 400.1, 500.0)
    ],
    'O3': [
        (0.0, 50.0, 0.0, 50.0),
        (50.1, 100.0, 50.1, 100.0),
        (100.1, 168.0, 100.1, 200.0),
        (168.1, 208.0, 200.1, 300.0),
        (208.1, 748.0, 300.1, 400.0),
        (748.1, 1000.0, 400.1, 500.0)
    ]
}

def calculate_sub_index(pollutant, value):
    if pollutant not in BREAKPOINTS:
        return 0
    if value < 0:
        return 0
    for low_p, high_p, low_a, high_a in BREAKPOINTS[pollutant]:
        if low_p <= value <= high_p:
            return low_a + (value - low_p) * (high_a - low_a) / (high_p - low_p)
    # If it exceeds maximum breakpoint, cap it at 500
    return 500.0

def calculate_aqi(row):
    sub_indices = []
    # In CPCB, AQI requires at least 3 pollutants, including PM2.5 or PM10
    active_pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']
    for p in active_pollutants:
        val = row.get(p, 0)
        sub_indices.append(calculate_sub_index(p, val))
    return int(round(max(sub_indices)))

def get_category(aqi):
    if aqi <= 50:
        return 'Good'
    elif aqi <= 100:
        return 'Satisfactory'
    elif aqi <= 200:
        return 'Moderate'
    elif aqi <= 300:
        return 'Poor'
    elif aqi <= 400:
        return 'Very Poor'
    else:
        return 'Severe'

def generate_city_data(city_name, base_p_params, start_date, end_date):
    print(f"Generating data for {city_name}...")
    dates = pd.date_range(start=start_date, end=end_date, freq='h')
    n = len(dates)
    
    # Base values
    pm25_base = base_p_params['pm25']
    pm10_base = base_p_params['pm10']
    no2_base = base_p_params['no2']
    so2_base = base_p_params['so2']
    co_base = base_p_params['co']
    o3_base = base_p_params['o3']
    
    # Generate Weather with daily/seasonal trends
    doy = dates.dayofyear.values
    hour = dates.hour.values
    
    temp_seasonal = 10 * np.sin(2 * np.pi * (doy - 100) / 365) + 26
    temp_diurnal = 5 * np.sin(2 * np.pi * (hour - 8) / 24)
    temperature = temp_seasonal + temp_diurnal + np.random.normal(0, 1.5, n)
    
    humidity_seasonal = 25 * np.sin(2 * np.pi * (doy - 180) / 365) + 60
    humidity_diurnal = -10 * np.sin(2 * np.pi * (hour - 8) / 24)
    humidity = np.clip(humidity_seasonal + humidity_diurnal + np.random.normal(0, 5, n), 10, 100)
    
    wind_speed = np.clip(3 * np.sin(2 * np.pi * (doy - 120) / 365) + 6 + np.random.normal(0, 2, n), 0.5, 25)
    pressure = 1010 - 8 * np.sin(2 * np.pi * (doy - 100) / 365) + np.random.normal(0, 1, n)
    
    monsoon_prob = np.where((doy >= 170) & (doy <= 270), 0.35, 0.02)
    rainfall_event = np.random.binomial(1, monsoon_prob, n)
    rainfall = rainfall_event * np.random.exponential(5, n)
    
    traffic_factor = 1.0 + 0.6 * np.exp(-((hour - 9)/2)**2) + 0.8 * np.exp(-((hour - 19)/3)**2)
    
    winter_mask = (doy > 300) | (doy < 60)
    inversion_factor = np.where(winter_mask, 1.8, 0.9)
    wind_dilution = 1.2 / (1.0 + 0.15 * wind_speed)
    rain_washout = np.where(rainfall > 0.5, 0.4, 1.0)
    
    noise = np.random.lognormal(0, 0.18, n)
    
    pm25 = pm25_base * traffic_factor * inversion_factor * wind_dilution * rain_washout * noise
    pm10 = pm10_base * traffic_factor * inversion_factor * wind_dilution * rain_washout * noise * 1.6
    no2 = no2_base * traffic_factor * inversion_factor * wind_dilution * noise
    so2 = so2_base * (1.0 + 0.1 * np.random.normal(0, 1, n)) * wind_dilution
    co = co_base * traffic_factor * inversion_factor * wind_dilution * noise
    o3 = o3_base * (1.0 + 0.4 * np.sin(2 * np.pi * (hour - 12) / 24)) * (temperature / 25.0) * noise
    
    if city_name == 'Delhi':
        crop_burning_mask = (doy >= 300) & (doy <= 320)
        pm25[crop_burning_mask] *= 2.5
        pm10[crop_burning_mask] *= 2.2
        diwali_mask = (doy >= 313) & (doy <= 316)
        pm25[diwali_mask] *= 3.5
        pm10[diwali_mask] *= 3.0
        so2[diwali_mask] *= 2.0
    
    pm25 = np.clip(pm25, 2.0, 999.0)
    pm10 = np.clip(pm10, 5.0, 1200.0)
    no2 = np.clip(no2, 1.0, 400.0)
    so2 = np.clip(so2, 0.5, 300.0)
    co = np.clip(co, 0.05, 15.0)
    o3 = np.clip(o3, 1.0, 300.0)
    
    df = pd.DataFrame({
        'Timestamp': dates,
        'City': city_name,
        'PM2.5': np.round(pm25, 1),
        'PM10': np.round(pm10, 1),
        'NO2': np.round(no2, 1),
        'SO2': np.round(so2, 1),
        'CO': np.round(co, 2),
        'O3': np.round(o3, 1),
        'Temperature': np.round(temperature, 1),
        'Humidity': np.round(humidity, 1),
        'Wind Speed': np.round(wind_speed, 1),
        'Pressure': np.round(pressure, 1),
        'Rainfall': np.round(rainfall, 2)
    })
    
    df['AQI'] = df.apply(calculate_aqi, axis=1)
    df['Category'] = df['AQI'].apply(get_category)
    
    return df

def generate_all_datasets():
    start_date = datetime.now() - timedelta(days=365 * 2)
    end_date = datetime.now()
    
    cities_params = {
        'Delhi': {'pm25': 85.0, 'pm10': 150.0, 'no2': 35.0, 'so2': 12.0, 'co': 1.2, 'o3': 40.0},
        'Mumbai': {'pm25': 38.0, 'pm10': 70.0, 'no2': 22.0, 'so2': 8.0, 'co': 0.6, 'o3': 32.0},
        'Pune': {'pm25': 42.0, 'pm10': 78.0, 'no2': 24.0, 'so2': 9.0, 'co': 0.7, 'o3': 35.0}
    }
    
    all_dfs = []
    for city, params in cities_params.items():
        city_df = generate_city_data(city, params, start_date, end_date)
        all_dfs.append(city_df)
        
    full_df = pd.concat(all_dfs, ignore_index=True)
    
    os.makedirs('backend/ml_pipeline/data', exist_ok=True)
    output_path = 'backend/ml_pipeline/data/historical_aqi.csv'
    full_df.to_csv(output_path, index=False)
    print(f"Data generation complete! Saved to {output_path} with {len(full_df)} rows.")

if __name__ == '__main__':
    generate_all_datasets()
