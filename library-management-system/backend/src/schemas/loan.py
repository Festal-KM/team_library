"""
貸出関連のPydanticスキーマ
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

from src.models.loan import LoanStatus


class LoanBase(BaseModel):
    """貸出ベーススキーマ"""
    user_id: int = Field(..., description="ユーザーID")
    book_id: int = Field(..., description="書籍ID")
    notes: Optional[str] = Field(None, max_length=500, description="備考")


class LoanCreate(LoanBase):
    """貸出作成スキーマ"""
    loan_period: Optional[int] = Field(14, ge=1, le=30, description="貸出期間（日数）")


class BorrowBookRequest(BaseModel):
    """書籍貸出リクエストスキーマ"""
    user_id: int = Field(..., description="ユーザーID")
    loan_period: Optional[int] = Field(14, ge=1, le=30, description="貸出期間（日数）")


class LoanUpdate(BaseModel):
    """貸出更新スキーマ"""
    notes: Optional[str] = Field(None, max_length=500, description="備考")
    status: Optional[LoanStatus] = Field(None, description="貸出ステータス")


class LoanReturn(BaseModel):
    """書籍返却スキーマ"""
    notes: Optional[str] = Field(None, max_length=500, description="返却時の備考")


class LoanExtension(BaseModel):
    """貸出延長スキーマ"""
    extension_days: int = Field(7, ge=1, le=14, description="延長日数")


class LoanMarkLost(BaseModel):
    """紛失処理スキーマ"""
    notes: Optional[str] = Field(None, max_length=500, description="紛失処理の備考")


# ネストされたスキーマ用
class UserBasic(BaseModel):
    """ユーザー基本情報"""
    id: int
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
    image_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class LoanResponse(LoanBase):
    """貸出レスポンススキーマ"""
    id: int
    loan_date: date
    due_date: date
    return_date: Optional[date] = None
    status: LoanStatus
    renewal_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    # ネストされた関連データ
    user: Optional[UserBasic] = None
    book: Optional[BookBasic] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @property
    def is_overdue(self) -> bool:
        """返却期限切れかどうか"""
        return self.status == LoanStatus.ACTIVE and self.due_date < date.today()
    
    @property
    def days_overdue(self) -> int:
        """返却期限超過日数"""
        if not self.is_overdue:
            return 0
        return (date.today() - self.due_date).days


class LoanListResponse(BaseModel):
    """貸出一覧レスポンススキーマ"""
    loans: List[LoanResponse]
    total: int
    page: int
    per_page: int
    pages: int


class LoanStatistics(BaseModel):
    """貸出統計スキーマ"""
    total_loans: int = Field(..., description="総貸出数")
    active_loans: int = Field(..., description="アクティブ貸出数")
    overdue_loans: int = Field(..., description="期限切れ貸出数")
    returned_loans: int = Field(..., description="返却済み貸出数")
    lost_loans: int = Field(..., description="紛失貸出数")
    return_rate: float = Field(..., description="返却率（%）")


# API レスポンス用
class LoanCreateResponse(BaseModel):
    """貸出作成レスポンス"""
    message: str
    loan: LoanResponse


class LoanReturnResponse(BaseModel):
    """書籍返却レスポンス"""
    message: str
    loan: LoanResponse


class LoanExtensionResponse(BaseModel):
    """貸出延長レスポンス"""
    message: str
    loan: LoanResponse
    new_due_date: date


class LoanErrorResponse(BaseModel):
    """貸出エラーレスポンス"""
    error: str
    detail: str 