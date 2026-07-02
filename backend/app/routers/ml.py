from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import json
import os

from app.database import get_db
from app.models import User, Log, Sensor, AQIReading
from app.auth import get_admin_user
from ml_pipeline.train import train_and_evaluate
from ml_pipeline.predict import AQIPredictor

router = APIRouter(prefix="/ml", tags=["Machine Learning"])
predictor = AQIPredictor()

# Background task for training
def bg_retrain_model(user_id: int, db_session_factory):
    db = db_session_factory()
    try:
        print("Starting ML Model Retraining in background...")
        metadata = train_and_evaluate()
        
        # Reload predictor resources after training completes
        global predictor
        predictor.load_resources()
        
        log = Log(user_id=user_id, action="retrain_ml", details=f"Model retraining completed. Best model selected: {metadata.get('best_model')}")
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Error during background training: {e}")
        log = Log(user_id=user_id, action="retrain_ml_failed", details=f"Model retraining failed: {str(e)}")
        db.add(log)
        db.commit()
    finally:
        db.close()

@router.post("/retrain", status_code=status.HTTP_202_ACCEPTED)
def retrain_model(background_tasks: BackgroundTasks, current_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Check if dataset exists, if not generate it
    csv_path = 'backend/ml_pipeline/data/historical_aqi.csv'
    if not os.path.exists(csv_path):
        from ml_pipeline.data_generator import generate_all_datasets
        generate_all_datasets()
        
    # Trigger background training
    from app.database import SessionLocal
    background_tasks.add_task(bg_retrain_model, current_user.id, SessionLocal)
    
    # Log retraining initialization
    log = Log(user_id=current_user.id, action="initiate_retrain_ml", details="User triggered model retraining.")
    db.add(log)
    db.commit()
    
    return {"status": "processing", "message": "Model retraining task submitted. Check audit logs for status."}

@router.get("/metrics")
def get_model_metrics():
    metadata_path = 'backend/ml_pipeline/models/model_metadata.json'
    if not os.path.exists(metadata_path):
        raise HTTPException(
            status_code=404, 
            detail="Model metrics metadata not found. Please train models first by calling /api/v1/ml/retrain"
        )
        
    with open(metadata_path, 'r') as f:
        metrics = json.load(f)
    return metrics

@router.post("/predict")
def predict_aqi(payload: dict):
    """
    Exposes direct prediction for testing.
    Payload should match current readings structure.
    """
    if not predictor.is_ready():
        # Trigger quick training if not trained
        raise HTTPException(
            status_code=400,
            detail="ML predictor not initialized. Please train the model via admin portal first."
        )
        
    res = predictor.make_prediction(payload)
    return res
