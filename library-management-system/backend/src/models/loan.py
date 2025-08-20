"""
貸出モデル
"""
from sqlalchemy import Column, Integer, ForeignKey, Date, Boolean, Enum, String
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel


class LoanStatus(enum.Enum):
    """貸出ステータス"""
    ACTIVE = "active"
    RETURNED = "returned"
    OVERDUE = "overdue"
    LOST = "lost"


class Loan(BaseModel):
    """貸出モデル"""
    __tablename__ = "loans"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    loan_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date)
    status = Column(Enum(LoanStatus), default=LoanStatus.ACTIVE, nullable=False)
    renewal_count = Column(Integer, default=0, nullable=False)
    notes = Column(String(500))
    
    # リレーション
    user = relationship("User", back_populates="loans")
    book = relationship("Book", back_populates="loans")
    
    def __repr__(self):
        return f"<Loan(user_id={self.user_id}, book_id={self.book_id}, status='{self.status}')>"
    
    @property
    def is_overdue(self) -> bool:
        """返却期限切れかどうか"""
        from datetime import date
        return self.status == LoanStatus.ACTIVE and self.due_date < date.today()
    
    @property
    def days_overdue(self) -> int:
        """返却期限超過日数"""
        if not self.is_overdue:
            return 0
        from datetime import date
        return (date.today() - self.due_date).days 