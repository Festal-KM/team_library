"""
書籍関連のPydanticスキーマ
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Union
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class BookStatus(str, Enum):
    """書籍ステータス"""
    AVAILABLE = "AVAILABLE"
    BORROWED = "BORROWED"
    RESERVED = "RESERVED"
    MAINTENANCE = "MAINTENANCE"
    LOST = "LOST"


class CategoryStructure(BaseModel):
    """階層カテゴリ構造"""
    major_category: str = Field(..., description="大項目カテゴリ")
    minor_categories: List[str] = Field(default_factory=list, description="中項目カテゴリ一覧")
    
    @validator('major_category')
    def validate_major_category(cls, v):
        from src.config.categories import MAJOR_CATEGORIES
        if v not in MAJOR_CATEGORIES:
            raise ValueError(f'大項目カテゴリは{MAJOR_CATEGORIES}のいずれかである必要があります')
        return v
    
    @validator('minor_categories')
    def validate_minor_categories(cls, v, values):
        if 'major_category' in values:
            from src.config.categories import get_minor_categories
            valid_minors = get_minor_categories(values['major_category'])
            for minor in v:
                if minor not in valid_minors:
                    raise ValueError(f'中項目カテゴリ"{minor}"は大項目"{values["major_category"]}"の有効な中項目ではありません')
        return v


class BookBase(BaseModel):
    """書籍の基本情報"""
    title: str = Field(..., min_length=1, max_length=255, description="書籍タイトル")
    author: str = Field(..., min_length=1, max_length=255, description="著者")
    publisher: Optional[str] = Field(None, max_length=255, description="出版社")
    isbn: Optional[str] = Field(None, max_length=20, description="ISBN")
    publication_date: Optional[date] = Field(None, description="出版日")
    categories: Optional[List[str]] = Field(default_factory=list, description="旧形式カテゴリ（後方互換性）")
    category_structure: Optional[CategoryStructure] = Field(None, description="階層カテゴリ構造")
    description: Optional[str] = Field(None, max_length=2000, description="説明")
    image_url: Optional[str] = Field(None, max_length=500, description="画像URL")
    location: Optional[str] = Field(None, max_length=100, description="配置場所")
    price: Optional[Decimal] = Field(None, ge=0, description="価格")
    status: BookStatus = Field(BookStatus.AVAILABLE, description="書籍ステータス")
    total_copies: int = Field(1, ge=1, description="総冊数")
    available_copies: int = Field(1, ge=0, description="利用可能冊数")

    @validator('isbn')
    def validate_isbn(cls, v):
        """ISBN形式の簡易バリデーション"""
        if v and v.strip():
            # ハイフンを除去して数字のみにする
            isbn_digits = ''.join(filter(str.isdigit, v))
            if len(isbn_digits) not in [10, 13]:
                raise ValueError('ISBNは10桁または13桁である必要があります')
        return v


class BookCreate(BookBase):
    """書籍作成用スキーマ"""
    def __init__(self, **data):
        # category_structureが未設定の場合、デフォルト値を設定
        if 'category_structure' not in data or data['category_structure'] is None:
            data['category_structure'] = CategoryStructure(
                major_category="技術書",
                minor_categories=[]
            )
        super().__init__(**data)


class BookUpdate(BookBase):
    """書籍更新用スキーマ"""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="書籍タイトル")
    author: Optional[str] = Field(None, min_length=1, max_length=255, description="著者")
    publisher: Optional[str] = Field(None, max_length=255, description="出版社")
    isbn: Optional[str] = Field(None, max_length=20, description="ISBN")
    publication_date: Optional[date] = Field(None, description="出版日")
    categories: Optional[List[str]] = Field(None, description="カテゴリ（複数選択可）")
    category_structure: Optional[CategoryStructure] = Field(None, description="階層カテゴリ構造")
    description: Optional[str] = Field(None, max_length=2000, description="説明")
    image_url: Optional[str] = Field(None, max_length=500, description="画像URL")
    location: Optional[str] = Field(None, max_length=100, description="配置場所")
    price: Optional[Decimal] = Field(None, ge=0, description="価格")
    status: Optional[BookStatus] = Field(None, description="書籍ステータス")
    total_copies: Optional[int] = Field(None, ge=1, description="総冊数")
    available_copies: Optional[int] = Field(None, ge=0, description="利用可能冊数")

    @validator('isbn')
    def validate_isbn(cls, v):
        """ISBN形式の簡易バリデーション"""
        if v and v.strip():
            isbn_digits = ''.join(filter(str.isdigit, v))
            if len(isbn_digits) not in [10, 13]:
                raise ValueError('ISBNは10桁または13桁である必要があります')
        return v


class BookResponse(BookBase):
    """書籍レスポンス用スキーマ"""
    id: int = Field(..., description="書籍ID")
    created_at: datetime = Field(..., description="登録日時")
    updated_at: Optional[datetime] = Field(None, description="更新日時")
    is_available: bool = Field(..., description="貸出可能かどうか")
    current_borrower_id: Optional[int] = Field(None, description="現在の借用者ID")
    current_borrower_name: Optional[str] = Field(None, description="現在の借用者名")

    class Config:
        from_attributes = True


class BookListResponse(BaseModel):
    """書籍一覧レスポンス用スキーマ"""
    books: List[BookResponse] = Field(..., description="書籍一覧")
    total: int = Field(..., description="総件数")
    page: int = Field(..., description="現在のページ")
    per_page: int = Field(..., description="1ページあたりの件数")
    has_next: bool = Field(..., description="次のページが存在するか")
    has_prev: bool = Field(..., description="前のページが存在するか")


class BookSearchRequest(BaseModel):
    """書籍検索リクエスト用スキーマ"""
    query: Optional[str] = Field(None, max_length=255, description="検索クエリ")
    title: Optional[str] = Field(None, max_length=255, description="タイトル検索")
    author: Optional[str] = Field(None, max_length=255, description="著者検索")
    category: Optional[str] = Field(None, max_length=100, description="カテゴリ検索")
    available_only: bool = Field(False, description="利用可能な書籍のみ")
    page: int = Field(1, ge=1, description="ページ番号")
    per_page: int = Field(20, ge=1, le=100, description="1ページあたりの件数")


class BookImportRequest(BaseModel):
    """書籍インポートリクエスト用スキーマ"""
    books: List[BookCreate] = Field(..., description="インポートする書籍一覧")

    @validator('books')
    def validate_books_count(cls, v):
        """一度にインポートできる書籍数を制限"""
        if len(v) > 100:
            raise ValueError('一度にインポートできる書籍は100冊までです')
        return v


class BookImportResponse(BaseModel):
    """書籍インポートレスポンス用スキーマ"""
    success_count: int = Field(..., description="成功件数")
    error_count: int = Field(..., description="エラー件数")
    errors: List[str] = Field(default_factory=list, description="エラーメッセージ一覧")
    imported_books: List[BookResponse] = Field(default_factory=list, description="インポートされた書籍一覧")


class BookImportFromPurchaseRequest(BaseModel):
    """購入リクエストからの書籍インポート用スキーマ"""
    title: str = Field(..., min_length=1, max_length=255, description="書籍タイトル")
    author: str = Field(..., min_length=1, max_length=255, description="著者")
    isbn: Optional[str] = Field(None, max_length=20, description="ISBN")
    publisher: Optional[str] = Field(None, max_length=255, description="出版社")
    estimated_price: Optional[float] = Field(None, ge=0, description="予想価格")
    reason: Optional[str] = Field(None, description="申請理由・説明")
    image_url: Optional[str] = Field(None, max_length=500, description="書籍画像URL")
    cover_image: Optional[str] = Field(None, max_length=500, description="書籍画像URL（別名）")
    category: Optional[str] = Field("その他", max_length=100, description="カテゴリ")
    location: Optional[str] = Field(None, max_length=100, description="配置場所")
    publication_date: Optional[str] = Field(None, description="出版日（文字列形式）")
    
    @validator('isbn')
    def validate_isbn(cls, v):
        """ISBN形式の簡易バリデーション"""
        if v and v.strip():
            isbn_digits = ''.join(filter(str.isdigit, v))
            if len(isbn_digits) not in [10, 13]:
                raise ValueError('ISBNは10桁または13桁である必要があります')
        return v 


class BookSearchParams(BaseModel):
    """書籍検索パラメータ"""
    title: Optional[str] = Field(None, description="タイトル検索")
    author: Optional[str] = Field(None, description="著者検索")
    isbn: Optional[str] = Field(None, description="ISBN検索")
    publisher: Optional[str] = Field(None, description="出版社検索")
    categories: Optional[List[str]] = Field(None, description="旧形式カテゴリフィルター")
    major_category: Optional[str] = Field(None, description="大項目カテゴリフィルター")
    minor_categories: Optional[List[str]] = Field(None, description="中項目カテゴリフィルター")
    status: Optional[BookStatus] = Field(None, description="ステータスフィルター")
    available_only: Optional[bool] = Field(False, description="利用可能書籍のみ")
    limit: int = Field(50, ge=1, le=100, description="取得件数制限")
    offset: int = Field(0, ge=0, description="取得開始位置")


class BookImportData(BaseModel):
    """書籍インポートデータ"""
    title: str
    author: str
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    publication_date: Optional[date] = None
    category_structure: Optional[CategoryStructure] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None


class CategoryListResponse(BaseModel):
    """カテゴリ一覧レスポンス"""
    major_categories: List[str] = Field(description="大項目カテゴリ一覧")
    category_structure: dict = Field(description="階層カテゴリ構造")
    
    @classmethod
    def get_categories(cls):
        """カテゴリ構造を取得"""
        from src.config.categories import MAJOR_CATEGORIES, CATEGORY_STRUCTURE
        return cls(
            major_categories=MAJOR_CATEGORIES,
            category_structure=CATEGORY_STRUCTURE
        ) 