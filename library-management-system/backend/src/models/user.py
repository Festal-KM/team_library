"""
ユーザーモデル
"""
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel


class UserRole(enum.Enum):
    """ユーザーロール"""
    ADMIN = "admin"
    APPROVER = "approver"
    USER = "user"


class User(BaseModel):
    """ユーザーモデル"""
    __tablename__ = "users"
    
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # リレーション
    loans = relationship("Loan", back_populates="user")
    reservations = relationship("Reservation", back_populates="user")
    purchase_requests = relationship("PurchaseRequest", back_populates="user")
    
    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}')>" 