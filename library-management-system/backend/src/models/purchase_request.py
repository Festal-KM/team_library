"""
購入申請モデル
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, Enum, Numeric
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel


class PurchaseRequestStatus(enum.Enum):
    """購入申請ステータス"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ORDERED = "ordered"
    RECEIVED = "received"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PurchaseRequest(BaseModel):
    """購入申請モデル"""
    __tablename__ = "purchase_requests"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    author = Column(String(255), nullable=False)
    isbn = Column(String(20))
    publisher = Column(String(255))
    estimated_price = Column(Numeric(10, 2))
    reason = Column(Text, nullable=False)
    status = Column(Enum(PurchaseRequestStatus), default=PurchaseRequestStatus.PENDING, nullable=False)
    admin_notes = Column(Text)
    priority = Column(Integer, default=3, nullable=False)  # 1:高, 2:中, 3:低
    image_url = Column(String(500))  # 書籍の画像URL
    
    # リレーション
    user = relationship("User", back_populates="purchase_requests")
    
    def __repr__(self):
        return f"<PurchaseRequest(title='{self.title}', status='{self.status}')>" 