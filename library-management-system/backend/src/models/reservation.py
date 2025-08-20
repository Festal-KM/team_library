"""
予約モデル
"""
from sqlalchemy import Column, Integer, ForeignKey, Date, Enum, String
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel


class ReservationStatus(enum.Enum):
    """予約ステータス"""
    PENDING = "pending"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class Reservation(BaseModel):
    """予約モデル"""
    __tablename__ = "reservations"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    reservation_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING, nullable=False)
    priority = Column(Integer, default=1, nullable=False)  # 予約順位
    notes = Column(String(500))
    
    # リレーション
    user = relationship("User", back_populates="reservations")
    book = relationship("Book", back_populates="reservations")
    
    def __repr__(self):
        return f"<Reservation(user_id={self.user_id}, book_id={self.book_id}, status='{self.status}')>"
    
    @property
    def is_expired(self) -> bool:
        """予約期限切れかどうか"""
        from datetime import date
        return self.expiry_date < date.today()
    
    @property
    def days_until_expiry(self) -> int:
        """予約期限までの日数"""
        from datetime import date
        return (self.expiry_date - date.today()).days 