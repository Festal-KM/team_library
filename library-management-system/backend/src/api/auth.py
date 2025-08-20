"""
認証関連API
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import timedelta
from typing import Optional

from src.database.connection import get_db
from src.models.user import User, UserRole
from src.utils.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    verify_refresh_token
)
from src.utils.dependencies import get_current_user
from src.config.settings import Settings

router = APIRouter()
settings = Settings()

# Pydanticモデル
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    full_name: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenRefresh(BaseModel):
    refresh_token: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    department: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class ResetPassword(BaseModel):
    user_id: int

@router.post("/login", response_model=Token, summary="ログイン")
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """ユーザーログイン"""
    # メールアドレスでユーザーを検索
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )
    
    # ユーザーのアクティブ状態をチェック
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="このアカウントは無効になっています。管理者にお問い合わせください",
        )
    
    # パスワード検証
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
        )
    
    # トークン生成
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # roleの値を安全に取得
    role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
    
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": role_value},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    # ユーザー情報を含めてレスポンス
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=role_value,
        full_name=user.full_name,
        department=user.department
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/login/oauth", response_model=Token, summary="OAuth2ログイン")
async def login_oauth(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2形式でのログイン（Swagger UI用）"""
    # メールアドレスでユーザーを検索
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # パスワード検証
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # トークン生成
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    # ユーザー情報を含めてレスポンス
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role.value,
        full_name=user.full_name,
        department=user.department
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/refresh", response_model=Token, summary="トークンリフレッシュ")
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """リフレッシュトークンを使用してアクセストークンを更新"""
    payload = verify_refresh_token(token_data.refresh_token)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なリフレッシュトークンです",
        )
    
    # ユーザーの存在確認
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが見つかりません",
        )
    
    # 新しいトークンを生成
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse, summary="現在のユーザー情報取得")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """現在ログイン中のユーザー情報を取得"""
    return current_user

@router.post("/register", response_model=UserResponse, summary="ユーザー登録")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """新規ユーザー登録"""
    # メールアドレスの重複チェック
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に登録されています",
        )
    
    # パスワードハッシュ化
    hashed_password = get_password_hash(user_data.password)
    
    # 新しいユーザーを作成
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role="USER",  # デフォルトは一般ユーザー（Enum値に合わせて修正）
        department=user_data.department
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/change-password", summary="パスワード変更")
async def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """現在のユーザーのパスワードを変更"""
    # 現在のパスワードを確認
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="現在のパスワードが正しくありません",
        )
    
    # 新しいパスワードをハッシュ化
    new_hashed_password = get_password_hash(password_data.new_password)
    
    # パスワードを更新
    current_user.hashed_password = new_hashed_password
    db.commit()
    
    return {"message": "パスワードを変更しました"}

@router.post("/reset-password", summary="パスワードリセット（管理者用）")
async def reset_password(
    reset_data: ResetPassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """管理者がユーザーのパスワードをリセット"""
    # 管理者権限チェック
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です"
        )
    
    # 対象ユーザーを取得
    target_user = db.query(User).filter(User.id == reset_data.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # パスワードを "password123" にリセット
    new_hashed_password = get_password_hash("password123")
    target_user.hashed_password = new_hashed_password
    db.commit()
    
    return {
        "message": f"ユーザー「{target_user.full_name}」のパスワードを「password123」にリセットしました"
    }

@router.post("/logout", summary="ログアウト")
async def logout(current_user: User = Depends(get_current_user)):
    """ログアウト（トークンの無効化は将来的にRedisなどで実装）"""
    # 現在はクライアント側でトークンを削除することでログアウト
    # 将来的にはトークンブラックリストをRedisで管理
    return {"message": "正常にログアウトしました"} 