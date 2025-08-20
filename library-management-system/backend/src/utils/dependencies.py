"""
FastAPI依存関数
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from src.utils.auth import verify_token
from src.database.connection import get_db
from src.models.database import User

# HTTPBearer認証スキーム
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """現在のユーザーを取得"""
    token = credentials.credentials
    payload = verify_token(token)
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
        )
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なユーザーIDです",
        )
    
    # データベースからユーザーを取得
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが見つかりません",
        )
    
    # ユーザーのアクティブ状態をチェック
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="アカウントが無効になっています。管理者にお問い合わせください",
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """アクティブなユーザーを取得"""
    # get_current_user で既にアクティブ状態をチェック済み
    return current_user

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """管理者権限が必要"""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です",
        )
    return current_user

def require_approver_or_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """承認者または管理者権限が必要"""
    if current_user.role.value not in ["approver", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="承認者または管理者権限が必要です",
        )
    return current_user

def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """オプションで現在のユーザーを取得（認証なしでもアクセス可能）"""
    # Authorizationヘッダーを手動で取得
    authorization = request.headers.get("Authorization")
    
    if not authorization:
        return None
    
    if not authorization.startswith("Bearer "):
        return None
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        user_id_str = payload.get("sub")
        
        if user_id_str is None:
            return None
        
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except:
        return None 