import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

class AQIDataProcessor:
    def __init__(self, data_path='backend/ml_pipeline/data/historical_aqi.csv', models_dir='backend/ml_pipeline/models'):
        self.data_path = data_path
        self.models_dir = models_dir
        self.scaler = MinMaxScaler()
        self.feature_cols = None
        self.target_cols = ['AQI_lead_24', 'AQI_lead_48', 'AQI_lead_72']
        os.makedirs(self.models_dir, exist_ok=True)

    def load_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Dataset not found at {self.data_path}. Run data_generator.py first.")
        df = pd.read_csv(self.data_path)
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])
        df = df.sort_values(by=['City', 'Timestamp']).reset_index(drop=True)
        return df

    def engineer_features(self, df):
        print("Engineering features...")
        # Time-based features
        df['Hour'] = df['Timestamp'].dt.hour
        df['DayOfWeek'] = df['Timestamp'].dt.dayofweek
        df['Month'] = df['Timestamp'].dt.month
        df['DayOfYear'] = df['Timestamp'].dt.dayofyear
        
        # City label encoding
        city_mapping = {'Delhi': 0, 'Mumbai': 1, 'Pune': 2}
        df['City_Code'] = df['City'].map(city_mapping)
        
        # Lag features (grouped by city to prevent crossover leakage)
        # We create lags for AQI and key weather variables
        lags = [1, 2, 3, 6, 12, 24]
        for lag in lags:
            df[f'AQI_lag_{lag}'] = df.groupby('City')['AQI'].shift(lag)
            df[f'PM25_lag_{lag}'] = df.groupby('City')['PM2.5'].shift(lag)
            df[f'Temp_lag_{lag}'] = df.groupby('City')['Temperature'].shift(lag)
            
        # Rolling averages
        df['AQI_roll_mean_6h'] = df.groupby('City')['AQI'].transform(lambda x: x.rolling(window=6).mean())
        df['AQI_roll_mean_24h'] = df.groupby('City')['AQI'].transform(lambda x: x.rolling(window=24).mean())
        df['AQI_roll_std_24h'] = df.groupby('City')['AQI'].transform(lambda x: x.rolling(window=24).std())

        # Weather trend features
        df['Temp_change_24h'] = df['Temperature'] - df.groupby('City')['Temperature'].shift(24)
        df['Humid_change_24h'] = df['Humidity'] - df.groupby('City')['Humidity'].shift(24)
        
        # Lead features (Targets for prediction)
        # Lead 24h, 48h, 72h AQI
        df['AQI_lead_24'] = df.groupby('City')['AQI'].shift(-24)
        df['AQI_lead_48'] = df.groupby('City')['AQI'].shift(-48)
        df['AQI_lead_72'] = df.groupby('City')['AQI'].shift(-72)
        
        # Drop rows with NaN caused by lags or leads
        df = df.dropna().reset_index(drop=True)
        
        # Define feature columns
        self.feature_cols = [
            'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 
            'Temperature', 'Humidity', 'Wind Speed', 'Pressure', 'Rainfall',
            'Hour', 'DayOfWeek', 'Month', 'DayOfYear', 'City_Code',
            'AQI_lag_1', 'PM25_lag_1', 'Temp_lag_1',
            'AQI_lag_2', 'PM25_lag_2', 'Temp_lag_2',
            'AQI_lag_3', 'PM25_lag_3', 'Temp_lag_3',
            'AQI_lag_6', 'PM25_lag_6', 'Temp_lag_6',
            'AQI_lag_12', 'PM25_lag_12', 'Temp_lag_12',
            'AQI_lag_24', 'PM25_lag_24', 'Temp_lag_24',
            'AQI_roll_mean_6h', 'AQI_roll_mean_24h', 'AQI_roll_std_24h',
            'Temp_change_24h', 'Humid_change_24h'
        ]
        
        return df

    def prepare_data(self):
        df = self.load_data()
        df = self.engineer_features(df)
        
        X = df[self.feature_cols]
        y = df[self.target_cols]
        
        # Train-Test Split (80% train, 20% test)
        # Note: In time series, it is better to split sequentially to prevent future leakage
        # Split by timestamp
        split_idx = int(len(df) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        # Fit scaler on train, transform both
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Save scaler and feature columns info
        joblib.dump(self.scaler, os.path.join(self.models_dir, 'scaler.joblib'))
        joblib.dump(self.feature_cols, os.path.join(self.models_dir, 'feature_cols.joblib'))
        
        return X_train_scaled, X_test_scaled, y_train, y_test, X_train.columns

if __name__ == '__main__':
    processor = AQIDataProcessor()
    X_train, X_test, y_train, y_test, cols = processor.prepare_data()
    print(f"Features shape: {X_train.shape}, Targets shape: {y_train.shape}")
    print("Features: ", list(cols))
