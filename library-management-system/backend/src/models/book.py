"""
書籍モデル
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, Enum, Date, Numeric, JSON
from sqlalchemy.orm import relationship
import enum
import json
from typing import List, Optional
from .base import BaseModel


class BookStatus(enum.Enum):
    """書籍ステータス"""
    AVAILABLE = "AVAILABLE"
    BORROWED = "BORROWED"
    RESERVED = "RESERVED"
    MAINTENANCE = "MAINTENANCE"
    LOST = "LOST"


class Book(BaseModel):
    """書籍モデル"""
    __tablename__ = "books"
    
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False)
    isbn = Column(String(20), unique=True, index=True)
    publisher = Column(String(255))
    publication_date = Column(Date)
    categories = Column(JSON, default=lambda: [])  # 旧形式（後方互換性のため保持）
    category_structure = Column(JSON, default=lambda: {
        "major_category": "技術書",
        "minor_categories": []
    })  # 新形式：階層カテゴリ構造
    description = Column(Text)
    location = Column(String(100))  # 書架位置
    status = Column(Enum(BookStatus), default=BookStatus.AVAILABLE, nullable=False)
    total_copies = Column(Integer, default=1, nullable=False)
    available_copies = Column(Integer, default=1, nullable=False)
    image_url = Column(String(500))
    price = Column(Numeric(10, 2))  # 価格（10桁、小数点以下2桁）
    
    # リレーション
    loans = relationship("Loan", back_populates="book")
    reservations = relationship("Reservation", back_populates="book")
    
    def __repr__(self):
        return f"<Book(id={self.id}, title='{self.title}', author='{self.author}')>"
    
    @property
    def is_available(self) -> bool:
        """貸出可能かどうか"""
        # データベースの値が文字列の場合とEnumの場合の両方に対応
        if isinstance(self.status, str):
            # AVAILABLE または RESERVED の場合は利用可能とする
            # RESERVED は予約者にとって利用可能な状態
            status_available = self.status.upper() in ["AVAILABLE", "RESERVED"]
        else:
            # Enumの場合
            status_available = self.status in [BookStatus.AVAILABLE, BookStatus.RESERVED]
        
        return status_available and self.available_copies > 0
    
    @property
    def category_list(self) -> List[str]:
        """カテゴリリストを取得（後方互換性のため）"""
        if self.categories:
            return self.categories
        elif self.category_structure:
            # 新形式から旧形式に変換
            structure = self.category_structure
            if isinstance(structure, dict):
                major = structure.get("major_category", "")
                minors = structure.get("minor_categories", [])
                if major and minors:
                    return [f"{major}:{minor}" for minor in minors]
                elif major:
                    return [major]
        return []
    
    @property
    def category(self) -> Optional[str]:
        """単一カテゴリを取得（後方互換性のため）"""
        categories = self.category_list
        return categories[0] if categories else None
    
    def add_category(self, category: str) -> None:
        """カテゴリを追加"""
        if not category:
            return
        categories = self.category_list
        if category not in categories:
            categories.append(category)
            self.categories = categories
    
    def remove_category(self, category: str) -> None:
        """カテゴリを削除"""
        if not category:
            return
        categories = self.category_list
        if category in categories:
            categories.remove(category)
            self.categories = categories
    
    def set_categories(self, categories: List[str]) -> None:
        """カテゴリリストを設定"""
        # 重複除去と空文字列除去
        clean_categories = list(dict.fromkeys([cat.strip() for cat in categories if cat and cat.strip()]))
        self.categories = clean_categories 

    @property
    def major_category(self) -> str:
        """大項目カテゴリを取得"""
        if self.category_structure and isinstance(self.category_structure, dict):
            return self.category_structure.get("major_category", "技術書")
        return "技術書"

    @property
    def minor_categories(self) -> List[str]:
        """中項目カテゴリリストを取得"""
        if self.category_structure and isinstance(self.category_structure, dict):
            return self.category_structure.get("minor_categories", [])
        return []

    def set_category_structure(self, major_category: str, minor_categories: List[str] = None):
        """階層カテゴリ構造を設定"""
        if minor_categories is None:
            minor_categories = []
        
        self.category_structure = {
            "major_category": major_category,
            "minor_categories": minor_categories
        } 