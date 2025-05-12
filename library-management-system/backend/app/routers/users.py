from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.models import User, UserRole
from app.data.store import user_store, loan_store, reservation_store, purchase_request_store
from pydantic import BaseModel, EmailStr

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.USER

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

@router.get("/", response_model=List[User])
async def get_users(
    role: Optional[str] = None
):
    """
    ユーザー一覧を取得
    オプションでロールで絞り込み可能
    """
    users = user_store.get_all()
    
    # ロールで絞り込み
    if role:
        try:
            role_enum = UserRole(role)
            users = [user for user in users if user.role == role_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"無効なロール: {role}")
    
    return users

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: int):
    """
    特定のユーザー情報を取得
    """
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return user

@router.post("/", response_model=User)
async def create_user(user: UserCreate):
    """
    新しいユーザーを作成
    """
    # メールアドレスの重複チェック
    existing_users = user_store.get_all()
    for existing_user in existing_users:
        if existing_user.email == user.email:
            raise HTTPException(status_code=400, detail=f"メールアドレス {user.email} は既に使用されています")
    
    # 新しいユーザーを作成
    user_data = user.model_dump()
    new_user = user_store.create(user_data)
    
    return new_user

@router.put("/{user_id}", response_model=User)
async def update_user(user_id: int, user_update: UserUpdate):
    """
    ユーザー情報を更新
    """
    existing_user = user_store.get_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # メールアドレスの更新がある場合は重複チェック
    if user_update.email and user_update.email != existing_user.email:
        existing_users = user_store.get_all()
        for user in existing_users:
            if user.id != user_id and user.email == user_update.email:
                raise HTTPException(status_code=400, detail=f"メールアドレス {user_update.email} は既に使用されています")
    
    # 更新するデータを準備（Noneでないフィールドのみ）
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    # 更新を実行
    updated_user = user_store.update(user_id, update_data)
    if not updated_user:
        raise HTTPException(status_code=500, detail="ユーザーの更新に失敗しました")
    
    return updated_user

@router.delete("/{user_id}")
async def delete_user(user_id: int):
    """
    ユーザーを削除
    """
    existing_user = user_store.get_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 活動中の貸出があるかチェック
    active_loans = loan_store.filter(user_id=user_id, is_returned=False)
    if active_loans:
        raise HTTPException(status_code=400, detail="貸出中の書籍があるユーザーは削除できません")
    
    # 活動中の予約があるかチェック
    active_reservations = reservation_store.filter(user_id=user_id, is_active=True)
    if active_reservations:
        raise HTTPException(status_code=400, detail="予約中の書籍があるユーザーは削除できません")
    
    # 処理中の購入申請があるかチェック
    pending_requests = purchase_request_store.filter(user_id=user_id, status="pending")
    if pending_requests:
        raise HTTPException(status_code=400, detail="処理中の購入申請があるユーザーは削除できません")
    
    # 削除実行
    success = user_store.delete(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="ユーザーの削除に失敗しました")
    
    return {"message": "ユーザーを削除しました", "id": user_id}

@router.get("/{user_id}/stats")
async def get_user_stats(user_id: int):
    """
    ユーザーの利用統計を取得
    """
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 現在借りている書籍数
    current_loans = loan_store.filter(user_id=user_id, is_returned=False)
    current_loan_count = len(current_loans)
    
    # 過去に借りた書籍数
    past_loans = loan_store.filter(user_id=user_id, is_returned=True)
    past_loan_count = len(past_loans)
    
    # 現在の予約数
    active_reservations = reservation_store.filter(user_id=user_id, is_active=True)
    reservation_count = len(active_reservations)
    
    # 購入申請数
    purchase_requests = purchase_request_store.filter(user_id=user_id)
    purchase_request_count = len(purchase_requests)
    
    return {
        "user_id": user_id,
        "name": user.name,
        "current_loans": current_loan_count,
        "past_loans": past_loan_count,
        "active_reservations": reservation_count,
        "purchase_requests": purchase_request_count
    }

@router.get("/roles", response_model=List[str])
async def get_available_roles():
    """
    利用可能なユーザーロール一覧を取得
    """
    return [role.value for role in UserRole] 