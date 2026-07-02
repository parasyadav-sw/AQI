import os
import sys
# Add current directory to path to allow relative imports in nested contexts
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import json

# We will import XGBoost conditionally, in case it's not installed yet.
try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

from data_processor import AQIDataProcessor

def calculate_metrics(y_true, y_pred):
    rmse = np.sqrt(mean_squared_error(y_true, y_pred, multioutput='raw_values'))
    mae = mean_absolute_error(y_true, y_pred, multioutput='raw_values')
    r2 = r2_score(y_true, y_pred, multioutput='raw_values')
    
    return {
        'rmse': [float(x) for x in rmse],
        'mae': [float(x) for x in mae],
        'r2': [float(x) for x in r2],
        'avg_rmse': float(np.mean(rmse)),
        'avg_mae': float(np.mean(mae)),
        'avg_r2': float(np.mean(r2))
    }

def train_and_evaluate():
    print("Initializing Data Processor...")
    processor = AQIDataProcessor()
    X_train, X_test, y_train, y_test, feature_cols = processor.prepare_data()
    
    models = {
        'Linear Regression': MultiOutputRegressor(LinearRegression()),
        'Decision Tree': MultiOutputRegressor(DecisionTreeRegressor(max_depth=12, random_state=42)),
        'Random Forest': MultiOutputRegressor(RandomForestRegressor(n_estimators=50, max_depth=12, random_state=42, n_jobs=-1)),
        'Neural Network (MLP)': MultiOutputRegressor(MLPRegressor(hidden_layer_sizes=(100, 50), max_iter=300, random_state=42, early_stopping=True))
    }
    
    if XGBOOST_AVAILABLE:
        print("XGBoost is available. Adding it to the pipeline.")
        models['XGBoost'] = MultiOutputRegressor(XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42, n_jobs=-1))
    else:
        print("XGBoost is not installed. Skipping XGBoost.")
        
    results = {}
    best_model_name = None
    best_rmse = float('inf')
    trained_models = {}
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        trained_models[name] = model
        
        # Predict and evaluate
        preds = model.predict(X_test)
        metrics = calculate_metrics(y_test, preds)
        results[name] = metrics
        
        print(f"[{name}] Avg RMSE: {metrics['avg_rmse']:.3f} | Avg R2: {metrics['avg_r2']:.3f}")
        
        if metrics['avg_rmse'] < best_rmse:
            best_rmse = metrics['avg_rmse']
            best_model_name = name
            
    print(f"\n=======================================================")
    print(f"BEST MODEL SELECTED: {best_model_name} (Avg RMSE: {best_rmse:.3f})")
    print(f"=======================================================")
    
    # Save the best model
    best_model = trained_models[best_model_name]
    model_path = os.path.join(processor.models_dir, 'best_model.joblib')
    joblib.dump(best_model, model_path)
    
    # Calculate feature importances from the best model (using the 24h estimator)
    importances = []
    # If the model has feature_importances_ (like DT, RF, XGB)
    # We take the first estimator (for 24h prediction)
    first_estimator = best_model.estimators_[0]
    if hasattr(first_estimator, 'feature_importances_'):
        importances = list(first_estimator.feature_importances_)
    elif hasattr(first_estimator, 'coef_'):
        importances = list(np.abs(first_estimator.coef_))
        # normalize
        total = sum(importances)
        if total > 0:
            importances = [x / total for x in importances]
    else:
        # For Neural Networks, compute simple permutation or mock feature importances based on weights
        # Or relative weight coefficients
        if hasattr(first_estimator, 'coefs_'):
            # sum absolute weights for each input node
            w_sum = np.sum(np.abs(first_estimator.coefs_[0]), axis=1)
            total = sum(w_sum)
            if total > 0:
                importances = list(w_sum / total)
            else:
                importances = [1/len(feature_cols)] * len(feature_cols)
        else:
            importances = [1/len(feature_cols)] * len(feature_cols)
            
    feature_importance_dict = dict(zip(feature_cols, [float(x) for x in importances]))
    # sort by importance
    sorted_importance = dict(sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True))
    
    # Save training metadata
    metadata = {
        'best_model': best_model_name,
        'metrics': results,
        'feature_importance': sorted_importance
    }
    
    metadata_path = os.path.join(processor.models_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Saved best model to {model_path}")
    print(f"Saved model training metadata to {metadata_path}")
    return metadata

if __name__ == '__main__':
    # Force data generation if not exists
    if not os.path.exists('backend/ml_pipeline/data/historical_aqi.csv'):
        print("No dataset found. Running data generator first...")
        from data_generator import generate_all_datasets
        generate_all_datasets()
        
    train_and_evaluate()
