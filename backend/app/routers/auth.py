from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import User, Log
from app.schemas import UserCreate, UserOut, Token, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, role: str = "citizen", db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Hash password and save
    hashed_pwd = get_password_hash(user_in.password)
    
    # Allow custom roles for hackathon demo convenience
    final_role = role if role in ["citizen", "government", "admin"] else "citizen"
    
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        name=user_in.name,
        phone=user_in.phone,
        role=final_role,
        language=user_in.language,
        is_verified=True # Auto-verify for ease of use in demo
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Add system log
    log = Log(user_id=user.id, action="register", details=f"User registered with email: {user.email}")
    db.add(log)
    db.commit()
    
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(
        subject=user.email,
        role=user.role,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Add system log
    log = Log(user_id=user.id, action="login", details=f"User logged in: {user.email}")
    db.add(log)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # In production, send email with verification token
    return {"message": f"Password reset link sent to {req.email} (mocked)"}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Simple mock token verification
    if req.token != "demo-token" and not req.token.startswith("ey"):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    # In production, decode JWT and find user
    # For demo, let's allow updating a hardcoded user or first admin
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No users exist")
        
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password reset successful"}
