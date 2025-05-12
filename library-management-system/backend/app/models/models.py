from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    APPROVER = "approver"
    ADMIN = "admin"

class User(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole = UserRole.USER

class Book(BaseModel):
    id: int
    title: str
    author: str
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    price: Optional[float] = None
    page_count: Optional[int] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.now)
    is_available: bool = True
    current_borrower_id: Optional[int] = None

class Loan(BaseModel):
    id: int
    book_id: int
    user_id: int
    borrowed_at: datetime = Field(default_factory=datetime.now)
    due_date: datetime
    returned_at: Optional[datetime] = None
    is_returned: bool = False

class Reservation(BaseModel):
    id: int
    book_id: int
    user_id: int
    reserved_at: datetime = Field(default_factory=datetime.now)
    position: int
    is_active: bool = True

class PurchaseRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PURCHASED = "purchased"

class PurchaseRequest(BaseModel):
    id: int
    user_id: int
    amazon_url: str
    title: str
    author: str
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    price: Optional[float] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    reason: str
    status: PurchaseRequestStatus = PurchaseRequestStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.now)
    approved_at: Optional[datetime] = None
    approver_id: Optional[int] = None
    purchase_date: Optional[datetime] = None 