"""
ユーザー関連API
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from ..database import get_db
from ..models.user import User, UserRole
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

# パスワードハッシュ化用
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    department: str | None = None
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: str = "user"
    department: str | None = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/", response_model=List[UserResponse], summary="ユーザー一覧取得")
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ユーザー一覧を取得（管理者のみ）"""
    
    # 管理者権限チェック
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    users = db.query(User).all()
    return users

@router.post("/", response_model=UserResponse, summary="新規ユーザー作成")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """新規ユーザーを作成（管理者のみ）"""
    
    # 管理者権限チェック
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    # メールアドレスの重複チェック
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="このメールアドレスは既に使用されています"
        )
    
    # ユーザー名の重複チェック
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="このユーザー名は既に使用されています"
        )
    
    # パスワードをハッシュ化
    hashed_password = pwd_context.hash(user_data.password)
    
    # ロールをEnumに変換
    try:
        if user_data.role == "admin":
            role = UserRole.ADMIN
        elif user_data.role == "approver":
            role = UserRole.APPROVER
        elif user_data.role == "user":
            role = UserRole.USER
        else:
            raise ValueError(f"無効なロール: {user_data.role}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 新規ユーザーを作成
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=role,
        department=user_data.department,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/{user_id}", response_model=UserResponse, summary="ユーザー詳細取得")
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """指定IDのユーザー詳細を取得"""
    
    # 管理者権限チェック
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    return user

@router.put("/{user_id}", response_model=UserResponse, summary="ユーザー更新")
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """指定IDのユーザー情報を更新"""
    
    # 管理者権限チェック
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # メールアドレスの重複チェック
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="このメールアドレスは既に使用されています"
            )
    
    # ユーザー名の重複チェック
    if user_update.username and user_update.username != user.username:
        existing_user = db.query(User).filter(
            User.username == user_update.username,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="このユーザー名は既に使用されています"
            )
    
    # 更新データを適用
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "role" and value:
            # ロールの場合はEnumに変換
            try:
                if value == "admin":
                    setattr(user, field, UserRole.ADMIN)
                elif value == "approver":
                    setattr(user, field, UserRole.APPROVER)
                elif value == "user":
                    setattr(user, field, UserRole.USER)
                else:
                    raise ValueError(f"無効なロール: {value}")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        else:
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/{user_id}", summary="ユーザー削除")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """指定IDのユーザーを削除"""
    
    # 管理者権限チェック
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    # 自分自身は削除できない
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="自分自身は削除できません")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 関連データの確認（貸出中の書籍がある場合は削除不可）
    from ..models.loan import Loan
    active_loans = db.query(Loan).filter(
        Loan.user_id == user_id,
        Loan.status == "ACTIVE"
    ).count()
    
    if active_loans > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"貸出中の書籍が{active_loans}冊あるため削除できません"
        )
    
    # ユーザー削除
    db.delete(user)
    db.commit()
    
    return {"message": f"ユーザー '{user.full_name}' を削除しました"} 