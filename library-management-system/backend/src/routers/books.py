"""
書籍関連のAPIルーター
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from src.database.connection import get_db
from src.dependencies import get_current_user, admin_required
from src.models.user import User
from src.models.book import Book, BookStatus
from src.services.book_service import BookService
from src.schemas.book import (
    BookCreate, BookUpdate, BookResponse, BookSearchParams, 
    CategoryListResponse, CategoryStructure
)
from src.config.categories import MAJOR_CATEGORIES, CATEGORY_STRUCTURE, get_minor_categories
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("/categories", response_model=CategoryListResponse)
async def get_categories():
    """カテゴリ構造を取得"""
    return CategoryListResponse.get_categories()


@router.get("/categories/{major_category}/minors")
async def get_minor_categories_by_major(major_category: str):
    """指定した大項目の中項目一覧を取得"""
    if major_category not in MAJOR_CATEGORIES:
        raise HTTPException(status_code=400, detail="無効な大項目カテゴリです")
    
    minors = get_minor_categories(major_category)
    return {"major_category": major_category, "minor_categories": minors}


@router.get("/statistics")
async def get_category_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """カテゴリ別統計情報を取得"""
    book_service = BookService(db)
    stats = book_service.get_category_statistics()
    return stats


@router.get("/", response_model=List[BookResponse])
async def list_books(
    title: Optional[str] = Query(None, description="タイトルで検索"),
    author: Optional[str] = Query(None, description="著者で検索"),
    category: Optional[str] = Query(None, description="カテゴリで検索"),
    major_category: Optional[str] = Query(None, description="大項目カテゴリで検索"),
    minor_categories: Optional[str] = Query(None, description="中項目カテゴリで検索（カンマ区切り）"),
    status: Optional[str] = Query(None, description="ステータスで検索"),
    available_only: bool = Query(False, description="利用可能な書籍のみ"),
    limit: int = Query(50, description="取得件数"),
    offset: int = Query(0, description="オフセット"),
    db: Session = Depends(get_db)
):
    """書籍一覧取得（検索・フィルタリング対応）"""
    book_service = BookService(db)
    
    # 中項目カテゴリをリストに変換
    minor_categories_list = None
    if minor_categories:
        minor_categories_list = [cat.strip() for cat in minor_categories.split(',')]
    
    books = book_service.search_books(
        title=title,
        author=author,
        category=category,
        major_category=major_category,
        minor_categories=minor_categories_list,
        status=status,
        available_only=available_only,
        limit=limit,
        offset=offset
    )
    
    return [BookResponse.from_orm(book) for book in books]



@router.post("/", response_model=BookResponse)
async def create_book(
    book_data: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """書籍作成"""
    book_service = BookService(db)
    
    try:
        book = book_service.create_book(book_data)
        logger.info(f"書籍作成成功: {book.title} (ID: {book.id}) by {current_user.name}")
        return BookResponse.from_orm(book)
    except Exception as e:
        logger.error(f"書籍作成エラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_data: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """書籍更新"""
    book_service = BookService(db)
    
    book = book_service.update_book(book_id, book_data)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    logger.info(f"書籍更新成功: {book.title} (ID: {book.id}) by {current_user.name}")
    return BookResponse.from_orm(book)


@router.delete("/{book_id}")
async def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """書籍削除"""
    book_service = BookService(db)
    
    # 削除前に書籍情報を取得（ログ用）
    book = book_service.get_book_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    success = book_service.delete_book(book_id)
    if not success:
        raise HTTPException(status_code=400, detail="書籍の削除に失敗しました")
    
    logger.info(f"書籍削除成功: {book.title} (ID: {book_id}) by {current_user.name}")
    return {"message": "書籍が正常に削除されました"}


@router.post("/import")
async def import_books(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """書籍一括インポート（CSV）"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="CSVファイルのみサポートしています")
    
    book_service = BookService(db)
    
    try:
        content = await file.read()
        import csv
        import io
        
        csv_data = io.StringIO(content.decode('utf-8'))
        reader = csv.DictReader(csv_data)
        
        imported_books = []
        error_books = []
        
        for row_num, row in enumerate(reader, start=2):
            try:
                # 階層カテゴリ構造の設定
                major_category = row.get('major_category', '技術書')
                minor_categories_str = row.get('minor_categories', '')
                minor_categories = [cat.strip() for cat in minor_categories_str.split(',') if cat.strip()] if minor_categories_str else []
                
                category_structure = CategoryStructure(
                    major_category=major_category,
                    minor_categories=minor_categories
                )
                
                book_create = BookCreate(
                    title=row['title'],
                    author=row['author'],
                    isbn=row.get('isbn'),
                    publisher=row.get('publisher'),
                    description=row.get('description'),
                    category_structure=category_structure,
                    price=float(row['price']) if row.get('price') else None
                )
                
                book = book_service.create_book(book_create)
                imported_books.append(book.id)
                
            except Exception as e:
                error_books.append({"row": row_num, "error": str(e), "data": row})
        
        logger.info(f"書籍インポート完了: 成功={len(imported_books)}, エラー={len(error_books)} by {current_user.name}")
        
        return {
            "imported_count": len(imported_books),
            "error_count": len(error_books),
            "imported_book_ids": imported_books,
            "errors": error_books[:10]  # 最初の10件のエラーのみ返す
        }
        
    except Exception as e:
        logger.error(f"書籍インポートエラー: {e}")
        raise HTTPException(status_code=400, detail=f"インポート処理中にエラーが発生しました: {str(e)}")


@router.get("/category/{major_category}")
async def get_books_by_major_category(
    major_category: str,
    minor_categories: Optional[str] = Query(None, description="中項目カテゴリフィルター（カンマ区切り）"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """大項目カテゴリによる書籍取得"""
    if major_category not in MAJOR_CATEGORIES:
        raise HTTPException(status_code=400, detail="無効な大項目カテゴリです")
    
    book_service = BookService(db)
    
    minor_categories_list = None
    if minor_categories:
        minor_categories_list = [cat.strip() for cat in minor_categories.split(",") if cat.strip()]
    
    books = book_service.get_books_by_category_structure(
        major_category=major_category,
        minor_categories=minor_categories_list
    )
    
    return [BookResponse.from_orm(book) for book in books]


@router.post("/{book_id}/migrate-categories")
async def migrate_book_categories(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """個別書籍のカテゴリを階層構造に移行"""
    book_service = BookService(db)
    
    book = book_service.migrate_legacy_categories(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    logger.info(f"カテゴリ移行完了: {book.title} (ID: {book_id}) by {current_user.name}")
    return BookResponse.from_orm(book)


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: int, db: Session = Depends(get_db)):
    """書籍詳細取得"""
    book_service = BookService(db)
    book = book_service.get_book_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    return BookResponse.from_orm(book) 