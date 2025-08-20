"""
購入申請関連のPydanticスキーマ
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum

from src.models.purchase_request import PurchaseRequestStatus


class PurchaseRequestBase(BaseModel):
    """購入申請ベーススキーマ"""
    user_id: int = Field(..., description="ユーザーID")
    title: str = Field(..., max_length=255, description="書籍タイトル")
    author: str = Field(..., max_length=255, description="著者")
    isbn: Optional[str] = Field(None, max_length=20, description="ISBN")
    publisher: Optional[str] = Field(None, max_length=255, description="出版社")
    estimated_price: Optional[Decimal] = Field(None, ge=0, description="予想価格")
    reason: str = Field(..., description="申請理由")
    image_url: Optional[str] = Field(None, max_length=500, description="書籍画像URL")


class PurchaseRequestCreate(PurchaseRequestBase):
    """購入申請作成スキーマ"""
    priority: Optional[int] = Field(3, ge=1, le=3, description="優先度（1:高, 2:中, 3:低）")
    amazon_url: Optional[str] = Field(None, max_length=1000, description="Amazon商品ページURL")


class PurchaseRequestUpdate(BaseModel):
    """購入申請更新スキーマ"""
    title: Optional[str] = Field(None, max_length=255, description="書籍タイトル")
    author: Optional[str] = Field(None, max_length=255, description="著者")
    isbn: Optional[str] = Field(None, max_length=20, description="ISBN")
    publisher: Optional[str] = Field(None, max_length=255, description="出版社")
    estimated_price: Optional[Decimal] = Field(None, ge=0, description="予想価格")
    reason: Optional[str] = Field(None, description="申請理由")
    priority: Optional[int] = Field(None, ge=1, le=3, description="優先度")
    admin_notes: Optional[str] = Field(None, description="管理者メモ")
    image_url: Optional[str] = Field(None, max_length=500, description="書籍画像URL")


class PurchaseRequestApproval(BaseModel):
    """購入申請承認スキーマ"""
    admin_notes: Optional[str] = Field(None, description="承認時のメモ")


class PurchaseRequestRejection(BaseModel):
    """購入申請却下スキーマ"""
    admin_notes: str = Field(..., description="却下理由")


class PurchaseRequestStatusUpdate(BaseModel):
    """購入申請ステータス更新スキーマ"""
    status: PurchaseRequestStatus = Field(..., description="新しいステータス")
    admin_notes: Optional[str] = Field(None, description="更新時のメモ")


class AmazonBookInfoRequest(BaseModel):
    """Amazon書籍情報取得リクエスト"""
    amazon_url: str = Field(..., description="AmazonのURL")


# ネストされたスキーマ用
class UserBasic(BaseModel):
    """ユーザー基本情報"""
    id: int
    full_name: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)


class PurchaseRequestResponse(PurchaseRequestBase):
    """購入申請レスポンススキーマ"""
    id: int
    status: PurchaseRequestStatus
    priority: int
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    amazon_url: Optional[str] = None
    
    # ネストされた関連データ
    user: Optional[UserBasic] = None
    
    model_config = ConfigDict(from_attributes=True)


class PurchaseRequestListResponse(BaseModel):
    """購入申請一覧レスポンススキーマ"""
    requests: List[PurchaseRequestResponse]
    total: int
    page: int
    per_page: int
    pages: int


class PurchaseRequestStatistics(BaseModel):
    """購入申請統計スキーマ"""
    total_requests: int = Field(..., description="総申請数")
    pending_requests: int = Field(..., description="承認待ち申請数")
    approved_requests: int = Field(..., description="承認済み申請数")
    rejected_requests: int = Field(..., description="却下申請数")
    ordered_requests: int = Field(..., description="発注済み申請数")
    received_requests: int = Field(..., description="受領済み申請数")
    cancelled_requests: int = Field(..., description="キャンセル申請数")
    approval_rate: float = Field(..., description="承認率（%）")
    total_budget: float = Field(..., description="総予算")


class AmazonBookInfo(BaseModel):
    """Amazon書籍情報"""
    title: str
    author: str
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    price: Optional[int] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    amazon_url: str


class AmazonBookInfoResponse(BaseModel):
    """Amazon書籍情報レスポンス"""
    success: bool
    book_info: Optional[AmazonBookInfo] = None
    error: Optional[str] = None
    detail: Optional[str] = None


# API レスポンス用
class PurchaseRequestCreateResponse(BaseModel):
    """購入申請作成レスポンス"""
    message: str
    request: PurchaseRequestResponse


class PurchaseRequestUpdateResponse(BaseModel):
    """購入申請更新レスポンス"""
    message: str
    request: PurchaseRequestResponse


class PurchaseRequestApprovalResponse(BaseModel):
    """購入申請承認レスポンス"""
    message: str
    request: PurchaseRequestResponse


class PurchaseRequestRejectionResponse(BaseModel):
    """購入申請却下レスポンス"""
    message: str
    request: PurchaseRequestResponse


class PurchaseRequestStatusResponse(BaseModel):
    """購入申請ステータス更新レスポンス"""
    message: str
    request: PurchaseRequestResponse


class PurchaseRequestErrorResponse(BaseModel):
    """購入申請エラーレスポンス"""
    error: str
    detail: str 