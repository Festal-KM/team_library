"""
予約関連のPydanticスキーマ
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

from src.models.reservation import ReservationStatus


class ReservationBase(BaseModel):
    """予約ベーススキーマ"""
    user_id: int = Field(..., description="ユーザーID")
    book_id: int = Field(..., description="書籍ID")
    notes: Optional[str] = Field(None, max_length=500, description="備考")


class ReservationCreate(ReservationBase):
    """予約作成スキーマ"""
    expiry_days: Optional[int] = Field(7, ge=1, le=30, description="予約期限（日数）")


class ReservationUpdate(BaseModel):
    """予約更新スキーマ"""
    notes: Optional[str] = Field(None, max_length=500, description="備考")
    status: Optional[ReservationStatus] = Field(None, description="予約ステータス")
    expiry_date: Optional[date] = Field(None, description="予約期限")


class ReservationCancel(BaseModel):
    """予約キャンセルスキーマ"""
    reason: Optional[str] = Field(None, max_length=500, description="キャンセル理由")


# ネストされたスキーマ用
class UserBasic(BaseModel):
    """ユーザー基本情報"""
    id: int
    username: str
    full_name: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)


class BookBasic(BaseModel):
    """書籍基本情報"""
    id: int
    title: str
    author: str
    isbn: Optional[str] = None
    status: str
    
    model_config = ConfigDict(from_attributes=True)


class ReservationResponse(ReservationBase):
    """予約レスポンススキーマ"""
    id: int
    reservation_date: date
    expiry_date: date
    status: ReservationStatus
    priority: int
    created_at: datetime
    updated_at: datetime
    
    # ネストされた関連データ
    user: Optional[UserBasic] = None
    book: Optional[BookBasic] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @property
    def is_expired(self) -> bool:
        """予約期限切れかどうか"""
        return self.expiry_date < date.today()
    
    @property
    def days_until_expiry(self) -> int:
        """予約期限までの日数"""
        return (self.expiry_date - date.today()).days


class ReservationListResponse(BaseModel):
    """予約一覧レスポンススキーマ"""
    reservations: List[ReservationResponse]
    total: int
    page: int
    per_page: int
    pages: int


class ReservationQueueResponse(BaseModel):
    """予約キューレスポンススキーマ"""
    book_id: int
    book_title: str
    queue: List[ReservationResponse]
    total_queue_length: int


class ReservationStatistics(BaseModel):
    """予約統計スキーマ"""
    total_reservations: int = Field(..., description="総予約数")
    pending_reservations: int = Field(..., description="待機中予約数")
    ready_reservations: int = Field(..., description="準備完了予約数")
    completed_reservations: int = Field(..., description="完了予約数")
    cancelled_reservations: int = Field(..., description="キャンセル予約数")
    expired_reservations: int = Field(..., description="期限切れ予約数")
    completion_rate: float = Field(..., description="完了率（%）")


# API レスポンス用
class ReservationCreateResponse(BaseModel):
    """予約作成レスポンス"""
    message: str
    reservation: ReservationResponse
    queue_position: Optional[int] = None


class ReservationCancelResponse(BaseModel):
    """予約キャンセルレスポンス"""
    message: str
    reservation: ReservationResponse


class ReservationProcessResponse(BaseModel):
    """予約処理レスポンス"""
    message: str
    processed_reservations: List[ReservationResponse]


class ReservationErrorResponse(BaseModel):
    """予約エラーレスポンス"""
    error: str
    detail: str 