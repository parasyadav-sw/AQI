import os
import joblib
import pandas as pd
import numpy as np
import json

class AQIPredictor:
    def __init__(self, models_dir='backend/ml_pipeline/models'):
        self.models_dir = models_dir
        self.scaler_path = os.path.join(models_dir, 'scaler.joblib')
        self.feature_cols_path = os.path.join(models_dir, 'feature_cols.joblib')
        self.model_path = os.path.join(models_dir, 'best_model.joblib')
        self.metadata_path = os.path.join(models_dir, 'model_metadata.json')
        
        self.scaler = None
        self.feature_cols = None
        self.model = None
        self.metadata = None
        
        self.load_resources()

    def load_resources(self):
        if os.path.exists(self.scaler_path):
            self.scaler = joblib.load(self.scaler_path)
        if os.path.exists(self.feature_cols_path):
            self.feature_cols = joblib.load(self.feature_cols_path)
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'r') as f:
                self.metadata = json.load(f)

    def is_ready(self):
        return (self.scaler is not None and 
                self.feature_cols is not None and 
                self.model is not None)

    def make_prediction(self, current_data, history=None):
        """
        current_data: dict containing current readings:
            - 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'
            - 'Temperature', 'Humidity', 'Wind Speed', 'Pressure', 'Rainfall'
            - 'City' (e.g. 'Delhi', 'Mumbai', 'Pune')
            - 'Timestamp' (datetime object or ISO string)
        history: list of recent historical records (up to 24 hourly records)
            each record is a dict with 'AQI', 'PM2.5', 'Temperature', 'Timestamp'
        """
        if not self.is_ready():
            # If model is not trained yet, run training dynamically or return a fallback
            return {
                'error': 'ML Model not trained. Defaulting to baseline predictions.',
                'predictions': {
                    '24h': int(current_data.get('AQI', 100) * 1.05),
                    '48h': int(current_data.get('AQI', 100) * 1.1),
                    '72h': int(current_data.get('AQI', 100) * 1.12)
                },
                'explainability': [
                    {'feature': 'PM2.5', 'contribution': 0.6, 'impact': 'High'},
                    {'feature': 'Temperature', 'contribution': 0.25, 'impact': 'Medium'},
                    {'feature': 'Humidity', 'contribution': 0.15, 'impact': 'Low'}
                ]
            }

        # Format input dictionary
        df_input = {}
        
        # Base values
        for col in ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 
                    'Temperature', 'Humidity', 'Wind Speed', 'Pressure', 'Rainfall']:
            df_input[col] = float(current_data.get(col, 0))
            
        # Time parsing
        ts = pd.to_datetime(current_data.get('Timestamp', pd.Timestamp.now()))
        df_input['Hour'] = ts.hour
        df_input['DayOfWeek'] = ts.dayofweek
        df_input['Month'] = ts.month
        df_input['DayOfYear'] = ts.dayofyear
        
        city_mapping = {'Delhi': 0, 'Mumbai': 1, 'Pune': 2}
        df_input['City_Code'] = city_mapping.get(current_data.get('City', 'Delhi'), 0)
        
        # Lag and rolling features from history
        # If no history is provided, we use current values as fallbacks for lags
        history_df = None
        if history and len(history) > 0:
            history_df = pd.DataFrame(history)
            history_df['Timestamp'] = pd.to_datetime(history_df['Timestamp'])
            history_df = history_df.sort_values(by='Timestamp').reset_index(drop=True)
            
        def get_lag_val(col_name, lag_hours, current_val):
            if history_df is None or len(history_df) < lag_hours:
                return current_val
            # Get record nearest to lag_hours ago
            target_time = ts - pd.Timedelta(hours=lag_hours)
            idx = (history_df['Timestamp'] - target_time).abs().idxmin()
            return history_df.loc[idx, col_name]
            
        current_aqi = current_data.get('AQI', 100)
        
        lags = [1, 2, 3, 6, 12, 24]
        for lag in lags:
            df_input[f'AQI_lag_{lag}'] = get_lag_val('AQI', lag, current_aqi)
            df_input[f'PM25_lag_{lag}'] = get_lag_val('PM2.5', lag, current_data.get('PM2.5', 50))
            df_input[f'Temp_lag_{lag}'] = get_lag_val('Temperature', lag, current_data.get('Temperature', 25))
            
        # Rolling averages from history
        if history_df is not None and len(history_df) >= 6:
            df_input['AQI_roll_mean_6h'] = history_df['AQI'].iloc[-6:].mean()
        else:
            df_input['AQI_roll_mean_6h'] = current_aqi
            
        if history_df is not None and len(history_df) >= 24:
            df_input['AQI_roll_mean_24h'] = history_df['AQI'].iloc[-24:].mean()
            df_input['AQI_roll_std_24h'] = history_df['AQI'].iloc[-24:].std()
        else:
            df_input['AQI_roll_mean_24h'] = current_aqi
            df_input['AQI_roll_std_24h'] = 5.0 # baseline std
            
        # Changes
        df_input['Temp_change_24h'] = float(df_input['Temperature'] - get_lag_val('Temperature', 24, df_input['Temperature']))
        df_input['Humid_change_24h'] = float(df_input['Humidity'] - get_lag_val('Humidity', 24, df_input['Humidity']))
        
        # Convert to DataFrame with correct column order
        df_row = pd.DataFrame([df_input])[self.feature_cols]
        
        # Scale
        scaled_row = self.scaler.transform(df_row)
        
        # Predict
        preds = self.model.predict(scaled_row)[0]
        
        # Clip outputs to valid AQI ranges (0-500)
        pred_24h = int(np.clip(preds[0], 0, 500))
        pred_48h = int(np.clip(preds[1], 0, 500))
        pred_72h = int(np.clip(preds[2], 0, 500))
        
        # Explainability: Local contributions
        # We look at the feature importances of the best model
        # and see which feature values are highest relative to average
        explainability = []
        feat_importances = self.metadata.get('feature_importance', {})
        
        # Normalize inputs for relative impact calculation
        row_normalized = scaled_row[0]
        
        impact_scores = []
        for idx, col in enumerate(self.feature_cols):
            importance = feat_importances.get(col, 0)
            # Impact is importance * scaled_value (gives local importance)
            impact = float(importance * row_normalized[idx])
            impact_scores.append((col, impact))
            
        impact_scores = sorted(impact_scores, key=lambda x: x[1], reverse=True)
        
        # Group similar features for presentation
        grouped_impacts = {
            'PM2.5': 0.0,
            'PM10': 0.0,
            'Gases (NO2/SO2/CO/O3)': 0.0,
            'Temperature & Humidity': 0.0,
            'Wind Speed & Pressure': 0.0,
            'Recent AQI History': 0.0
        }
        
        for feat, score in impact_scores:
            if feat in ['PM2.5', 'PM25_lag_1', 'PM25_lag_2', 'PM25_lag_3', 'PM25_lag_6', 'PM25_lag_12', 'PM25_lag_24']:
                grouped_impacts['PM2.5'] += score
            elif feat in ['PM10']:
                grouped_impacts['PM10'] += score
            elif feat in ['NO2', 'SO2', 'CO', 'O3']:
                grouped_impacts['Gases (NO2/SO2/CO/O3)'] += score
            elif feat in ['Temperature', 'Humidity', 'Temp_lag_1', 'Temp_change_24h', 'Humid_change_24h']:
                grouped_impacts['Temperature & Humidity'] += score
            elif feat in ['Wind Speed', 'Pressure', 'Rainfall']:
                grouped_impacts['Wind Speed & Pressure'] += score
            else:
                grouped_impacts['Recent AQI History'] += score
                
        # Normalize grouped impacts
        total_group_impact = sum(grouped_impacts.values())
        if total_group_impact > 0:
            explainability = [
                {
                    'feature': k, 
                    'contribution': round(v / total_group_impact, 2),
                    'impact': 'High' if (v / total_group_impact) > 0.25 else ('Medium' if (v / total_group_impact) > 0.1 else 'Low')
                }
                for k, v in grouped_impacts.items()
            ]
            explainability = sorted(explainability, key=lambda x: x['contribution'], reverse=True)
        else:
            explainability = [
                {'feature': 'PM2.5', 'contribution': 0.5, 'impact': 'High'},
                {'feature': 'Recent AQI History', 'contribution': 0.3, 'impact': 'Medium'},
                {'feature': 'Gases (NO2/SO2/CO/O3)', 'contribution': 0.2, 'impact': 'Low'}
            ]
            
        return {
            'model_used': self.metadata.get('best_model', 'Unknown'),
            'predictions': {
                '24h': pred_24h,
                '48h': pred_48h,
                '72h': pred_72h
            },
            'explainability': explainability
        }

if __name__ == '__main__':
    # Test predictor
    predictor = AQIPredictor()
    test_reading = {
        'PM2.5': 120.0,
        'PM10': 210.0,
        'NO2': 45.0,
        'SO2': 15.0,
        'CO': 1.8,
        'O3': 50.0,
        'Temperature': 18.0,
        'Humidity': 85.0,
        'Wind Speed': 2.0,
        'Pressure': 1012.0,
        'Rainfall': 0.0,
        'City': 'Delhi',
        'AQI': 280
    }
    
    if predictor.is_ready():
        res = predictor.make_prediction(test_reading)
        print("Test prediction result:")
        print(json.dumps(res, indent=4))
    else:
        print("Model assets not available. Train model first.")
