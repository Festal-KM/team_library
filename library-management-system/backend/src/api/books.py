"""
書籍関連API
"""
from fastapi import APIRouter, HTTPException, Depends, Query, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from urllib.parse import unquote

from src.database.connection import get_db
from src.services.book_service import BookService
from src.schemas.book import (
    BookResponse, BookCreate, BookUpdate, BookListResponse,
    BookSearchRequest, BookImportRequest, BookImportResponse,
    BookImportFromPurchaseRequest, CategoryListResponse, CategoryStructure
)
from src.utils.dependencies import get_current_user, require_admin, get_optional_current_user
from src.models.database import User
from src.services.loan_service import LoanService
from src.schemas.loan import LoanCreate, LoanResponse, BorrowBookRequest
from src.models.reservation import Reservation
from src.config.categories import MAJOR_CATEGORIES, CATEGORY_STRUCTURE, get_minor_categories

logger = logging.getLogger(__name__)
router = APIRouter()


def get_book_service(db: Session = Depends(get_db)) -> BookService:
    """BookServiceの依存関数"""
    return BookService(db)


@router.get("/", summary="書籍一覧取得")
def get_books(
    request: Request,
    title: Optional[str] = Query(None, description="タイトルで検索"),
    author: Optional[str] = Query(None, description="著者で検索"),
    major_category: Optional[str] = Query(None, description="大項目カテゴリで検索"),
    available_only: bool = Query(False, description="利用可能な書籍のみ"),
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(100, ge=1, le=500, description="1ページあたりの件数"),
    book_service: BookService = Depends(get_book_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """書籍一覧を取得"""
    skip = (page - 1) * per_page
    
    # RequestオブジェクトからminorCategoriesの配列を取得
    minor_categories_list = None
    query_params = request.query_params
    
    # minor_categories[] または minor_categories の形式で取得
    if "minor_categories[]" in query_params:
        minor_categories_raw = query_params.getlist("minor_categories[]")
        minor_categories_list = [unquote(cat).strip() for cat in minor_categories_raw if cat.strip()]
    elif "minor_categories" in query_params:
        minor_categories_raw = query_params.getlist("minor_categories")
        minor_categories_list = [unquote(cat).strip() for cat in minor_categories_raw if cat.strip()]
    
    if minor_categories_list and len(minor_categories_list) == 0:
        minor_categories_list = None
    
    # デバッグ用ログ出力
    logger.info(f"API parameters: major_category={major_category}, minor_categories_list={minor_categories_list}, available_only={available_only}")
    
    books = book_service.get_books(
        title=title,
        author=author,
        major_category=major_category,
        minor_categories=minor_categories_list,
        available_only=available_only,
        skip=skip,
        limit=per_page
    )
    
    # 総件数を取得（効率的なカウント）
    total = book_service.count_books(
        title=title,
        author=author,
        major_category=major_category,
        minor_categories=minor_categories_list,
        available_only=available_only
    )
    
    try:
        book_responses = []
        for book in books:
            book_data = {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "isbn": book.isbn,
                "publisher": book.publisher,
                "category_structure": book.category_structure or {"major_category": "技術書", "minor_categories": []},
                "description": book.description,
                "location": book.location,
                "status": book.status.value if hasattr(book.status, 'value') else str(book.status),
                "is_available": book.is_available,
                "total_copies": book.total_copies,
                "available_copies": book.available_copies,
                "image_url": book.image_url,
                "created_at": book.created_at.isoformat() if book.created_at else None,
                "updated_at": book.updated_at.isoformat() if book.updated_at else None
            }
            book_responses.append(book_data)
        
        return {
            "books": book_responses,
            "total": total,
            "page": page,
            "per_page": per_page,
            "has_next": len(books) == per_page and (skip + per_page) < total,
            "has_prev": page > 1
        }
    except Exception as e:
        print(f"❌ Book serialization error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "books": [],
            "total": 0,
            "page": page,
            "per_page": per_page,
            "has_next": False,
            "has_prev": False
        }


@router.get("/categories", response_model=CategoryListResponse, summary="カテゴリ構造取得")
async def get_categories():
    """カテゴリ構造を取得"""
    return CategoryListResponse.get_categories()


@router.get("/categories/{major_category}/minors", summary="中項目カテゴリ取得")
async def get_minor_categories_by_major(major_category: str):
    """指定した大項目の中項目一覧を取得"""
    if major_category not in MAJOR_CATEGORIES:
        raise HTTPException(status_code=400, detail="無効な大項目カテゴリです")
    
    minors = get_minor_categories(major_category)
    return {"major_category": major_category, "minor_categories": minors}


@router.get("/statistics", summary="カテゴリ統計取得")
async def get_category_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """カテゴリ別統計情報を取得"""
    book_service = BookService(db)
    stats = book_service.get_category_statistics()
    return stats


@router.get("/category/{major_category}", summary="大項目カテゴリによる書籍取得")
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


@router.get("/{book_id}", response_model=BookResponse, summary="書籍詳細取得")
def get_book(
    book_id: int,
    book_service: BookService = Depends(get_book_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """指定IDの書籍詳細を取得"""
    book = book_service.get_book_by_id(book_id)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="書籍が見つかりません"
        )
    
    return book


@router.get("/search/isbn/{isbn}", summary="ISBN検索（外部API連携）")
def search_book_by_isbn(
    isbn: str,
    book_service: BookService = Depends(get_book_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """ISBNで書籍を検索（外部API連携）"""
    try:
        # まずデータベース内を検索
        existing_book = book_service.get_book_by_isbn(isbn)
        if existing_book:
            return {
                "source": "database",
                "book_data": {
                    "title": existing_book.title,
                    "author": existing_book.author,
                    "publisher": existing_book.publisher or "",
                    "isbn": existing_book.isbn or "",
                    "publication_date": existing_book.publication_date.isoformat() if existing_book.publication_date else "",
                    "category": existing_book.category or "",
                    "description": existing_book.description or "",
                    "cover_image": existing_book.image_url or ""
                }
            }
        
        # データベースにない場合は外部APIで検索
        book_info = book_service.search_external_isbn(isbn)
        return book_info
        
    except Exception as e:
        logger.error(f"ISBN検索エラー: {e}")
        return {
            "source": "error",
            "book_data": {
                "title": "",
                "author": "",
                "publisher": "",
                "isbn": isbn,
                "publication_date": "",
                "category": "",
                "description": "",
                "cover_image": ""
            }
        }


@router.post("/search", response_model=List[BookResponse], summary="書籍検索")
def search_books(
    search_request: BookSearchRequest,
    book_service: BookService = Depends(get_book_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """書籍を検索"""
    if search_request.query:
        books = book_service.search_books(search_request.query)
    else:
        skip = (search_request.page - 1) * search_request.per_page
        books = book_service.get_books(
            title=search_request.title,
            author=search_request.author,
            category=search_request.category,
            available_only=search_request.available_only,
            skip=skip,
            limit=search_request.per_page
        )
    
    return books


@router.post("/", response_model=BookResponse, summary="書籍登録")
def create_book(
    book_data: BookCreate,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(require_admin)
):
    """新しい書籍を登録（管理者のみ）"""
    # ISBNの重複チェック（空でない場合のみ）
    if book_data.isbn and book_data.isbn.strip() and book_service.check_isbn_exists(book_data.isbn):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このISBNは既に登録されています"
        )
    
    try:
        book = book_service.create_book(book_data)  # 辞書変換せずBookCreateオブジェクトを直接渡す
        return book
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"書籍の登録に失敗しました: {str(e)}"
        )


@router.put("/{book_id}", response_model=BookResponse, summary="書籍更新")
def update_book(
    book_id: int,
    book_data: BookUpdate,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(require_admin)
):
    """書籍情報を更新（管理者のみ）"""
    # ISBNの重複チェック（自分以外、空でない場合のみ）
    if book_data.isbn and book_data.isbn.strip() and book_service.check_isbn_exists(book_data.isbn, exclude_id=book_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このISBNは既に他の書籍で使用されています"
        )
    
    # BookUpdateオブジェクトを直接渡す
    book = book_service.update_book(book_id, book_data)
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="書籍が見つかりません"
        )
    
    return book


@router.delete("/{book_id}", summary="書籍削除")
def delete_book(
    book_id: int,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(require_admin)
):
    """書籍を削除（管理者のみ）- 貸出中・予約中でも強制削除"""
    try:
        # 強制削除を有効にして実行
        success = book_service.delete_book(book_id, force=True)
        
        if success:
            return {"message": "書籍を削除しました（関連データも処理済み）"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="書籍の削除に失敗しました"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # より詳細なエラー情報を返す
        import traceback
        error_detail = f"削除エラー: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )


@router.post("/import", response_model=BookImportResponse, summary="書籍一括インポート")
def import_books(
    import_request: BookImportRequest,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(require_admin)
):
    """書籍を一括インポート（管理者のみ）"""
    success_count = 0
    error_count = 0
    errors = []
    imported_books = []
    
    for i, book_data in enumerate(import_request.books):
        try:
            # ISBNの重複チェック（空でない場合のみ）
            if book_data.isbn and book_data.isbn.strip() and book_service.check_isbn_exists(book_data.isbn):
                error_count += 1
                errors.append(f"書籍{i+1}: ISBN {book_data.isbn} は既に登録されています")
                continue
            
            book = book_service.create_book(book_data)  # 辞書変換せずBookCreateオブジェクトを直接渡す
            imported_books.append(book)
            success_count += 1
            
        except Exception as e:
            error_count += 1
            errors.append(f"書籍{i+1}: {str(e)}")
    
    return BookImportResponse(
        success_count=success_count,
        error_count=error_count,
        errors=errors,
        imported_books=imported_books
    )


@router.post("/import/json", response_model=BookResponse, summary="単一書籍インポート（JSON）")
def import_single_book_json(
    book_data: BookImportFromPurchaseRequest,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(get_current_user)
):
    """単一書籍をJSONでインポート（寄贈登録・購入リクエストからの変換）"""
    try:
        # ISBNがある場合、外部APIから価格情報を取得して補完
        estimated_price = book_data.estimated_price
        if book_data.isbn and book_data.isbn.strip():
            try:
                external_info = book_service.search_external_isbn(book_data.isbn)
                if external_info.get("book_data", {}).get("price"):
                    # 外部APIから価格が取得できた場合は、それを優先
                    estimated_price = external_info["book_data"]["price"]
                    logger.info(f"外部APIから価格を取得: {estimated_price}円")
            except Exception as e:
                logger.warning(f"外部API価格取得エラー: {e}")
        
        # 出版日の変換処理
        publication_date = None
        if book_data.publication_date:
            try:
                from datetime import datetime
                # 様々な日付形式に対応
                date_formats = ["%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日", "%Y-%m", "%Y/%m", "%Y年%m月", "%Y"]
                for fmt in date_formats:
                    try:
                        publication_date = datetime.strptime(book_data.publication_date, fmt).date()
                        break
                    except ValueError:
                        continue
            except Exception:
                # 日付変換に失敗した場合はNoneのまま
                pass
        
        # ISBNの重複チェック（空でない場合のみ）
        if book_data.isbn and book_data.isbn.strip() and book_service.check_isbn_exists(book_data.isbn):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ISBN {book_data.isbn} は既に登録されています"
            )
        
        # カテゴリ構造の設定
        from src.schemas.book import CategoryStructure
        
        # カテゴリのマッピング処理
        category = book_data.category or "その他技術"
        if category == "技術書":
            # 「技術書」の場合は「その他技術」に変換
            minor_categories = ["その他技術"]
        elif category in ["その他", "一般"]:
            # 汎用カテゴリの場合
            minor_categories = ["その他"]
        else:
            # 具体的なカテゴリの場合はそのまま使用
            minor_categories = [category]
        
        category_structure = CategoryStructure(
            major_category="技術書",  # デフォルトは技術書
            minor_categories=minor_categories
        )
        
        # BookCreateオブジェクトを作成
        book_create_data = BookCreate(
            title=book_data.title,
            author=book_data.author,
            publisher=book_data.publisher or "",
            isbn=book_data.isbn or "",
            publication_date=publication_date,
            description=book_data.reason or "",  # reasonをdescriptionに変換
            image_url=book_data.image_url or book_data.cover_image or "",  # 両方のフィールドをサポート
            location=book_data.location or "",
            price=estimated_price,
            category_structure=category_structure
        )
        
        # 書籍を作成
        book = book_service.create_book(book_create_data)
        return book
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"書籍インポートエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"書籍のインポートに失敗しました: {str(e)}"
        )


@router.get("/available", response_model=List[BookResponse], summary="利用可能書籍一覧")
def get_available_books(
    book_service: BookService = Depends(get_book_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """利用可能な書籍一覧を取得"""
    books = book_service.get_available_books()
    return books


@router.get("/popular", response_model=List[BookResponse], summary="人気書籍一覧")
def get_popular_books(
    limit: int = Query(10, ge=1, le=50, description="取得件数"),
    book_service: BookService = Depends(get_book_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """人気書籍一覧を取得"""
    books = book_service.get_popular_books(limit)
    return books


@router.post("/{book_id}/borrow", response_model=LoanResponse, summary="書籍を借りる")
def borrow_book(
    book_id: int,
    request: BorrowBookRequest,  # Pydanticモデルでリクエストボディを受け取る
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """書籍を借りる"""
    try:
        # 自分の貸出のみ許可（管理者は他のユーザーの代理貸出も可能）
        if (request.user_id != current_user.id and 
            current_user.role.value not in ["admin", "librarian"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="他のユーザーの代理貸出はできません"
            )
        
        # 書籍の存在確認
        book_service = BookService(db)
        book = book_service.get_book_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="書籍が見つかりません"
            )
        
        # 貸出処理
        loan_service = LoanService(db)
        loan_data = LoanCreate(
            user_id=request.user_id,
            book_id=book_id,
            loan_period=request.loan_period or 14
        )
        
        loan = loan_service.create_loan(loan_data)
        return loan
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"貸出処理に失敗しました: {str(e)}"
        )


@router.get("/{book_id}/reservations/count", summary="書籍の予約数取得")
def get_book_reservation_count(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """指定書籍の予約数を取得"""
    try:
        # 書籍の存在確認
        book_service = BookService(db)
        book = book_service.get_book_by_id(book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="書籍が見つかりません"
            )
        
        # 実際の予約数を取得
        reservation_count = db.query(Reservation).filter(
            Reservation.book_id == book_id,
            Reservation.status.in_(["active", "ready"])
        ).count()
        
        return {"count": reservation_count}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"予約数の取得に失敗しました: {str(e)}"
        ) 

@router.get("/test", summary="簡単なテスト用エンドポイント")
def test_books_api(
    book_service: BookService = Depends(get_book_service)
):
    """書籍APIの動作テスト"""
    try:
        print("🧪 テストAPI開始")
        
        # 1. 基本的なデータベース接続テスト
        print("📊 データベース接続テスト...")
        books = book_service.get_books(skip=0, limit=1)
        print(f"✅ 書籍取得成功: {len(books)}冊")
        
        if books:
            book = books[0]
            print(f"📖 サンプル書籍: {book.title}")
            print(f"📊 書籍ステータス: {book.status}")
            print(f"📊 書籍ステータス型: {type(book.status)}")
            
            # 2. シリアライゼーションテスト
            try:
                book_data = {
                    "id": book.id,
                    "title": book.title,
                    "status": str(book.status),
                    "created_at": str(book.created_at) if book.created_at else None
                }
                print("✅ シリアライゼーション成功")
                
                return {
                    "success": True,
                    "message": "書籍APIテスト成功",
                    "sample_book": book_data,
                    "total_books": len(books)
                }
            except Exception as serialize_error:
                print(f"❌ シリアライゼーションエラー: {serialize_error}")
                return {
                    "success": False,
                    "message": f"シリアライゼーションエラー: {serialize_error}",
                    "error_type": "serialization"
                }
        else:
            return {
                "success": True,
                "message": "データベースに書籍がありません",
                "total_books": 0
            }
            
    except Exception as e:
        print(f"❌ テストAPIエラー: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"テストAPIエラー: {str(e)}",
            "error_type": "general"
        }


@router.get("/admin/detailed", summary="管理者向け詳細書籍一覧（延滞情報含む）")
def get_admin_books_detailed(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(100, ge=1, le=500, description="1ページあたりの件数"),
    status_filter: Optional[str] = Query(None, description="ステータスフィルター: all, available, borrowed, overdue"),
    title: Optional[str] = Query(None, description="タイトルで検索"),
    author: Optional[str] = Query(None, description="著者で検索"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """管理者向け：延滞情報を含む詳細な書籍一覧を取得"""
    try:
        # まず延滞中のローンを更新
        loan_service = LoanService(db)
        updated_count = loan_service.update_overdue_loans()
        if updated_count > 0:
            logger.info(f"Updated {updated_count} loans to overdue status")
        
        skip = (page - 1) * per_page
        
        # 延滞情報を含む書籍データを取得
        books_with_status = loan_service.get_books_with_loan_status(
            skip=skip, 
            limit=per_page, 
            include_overdue_info=True
        )
        
        # 検索フィルターを適用
        filtered_books = []
        for book in books_with_status:
            # タイトル・著者検索
            if title and title.lower() not in book["title"].lower():
                continue
            if author and author.lower() not in book["author"].lower():
                continue
            
            # ステータスフィルター
            if status_filter:
                if status_filter == "available" and book["detailed_status"]["is_borrowed"]:
                    continue
                elif status_filter == "borrowed":
                    # 貸出中: 通常の貸出中 + 延滞中（両方含む）
                    if not book["detailed_status"]["is_borrowed"]:
                        continue
                elif status_filter == "overdue" and not book["detailed_status"]["is_overdue"]:
                    continue
            
            filtered_books.append(book)
        
        # 統計情報も取得
        stats = loan_service.get_loan_statistics()
        
        return {
            "books": filtered_books,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": len(filtered_books),  # 簡易実装
                "pages": (len(filtered_books) + per_page - 1) // per_page
            },
            "statistics": {
                "total_books": len(books_with_status),
                "overdue_count": len([b for b in filtered_books if b["detailed_status"]["is_overdue"]]),
                "borrowed_count": len([b for b in filtered_books if b["detailed_status"]["is_borrowed"]]),
                "available_count": len([b for b in filtered_books if not b["detailed_status"]["is_borrowed"]]),
                "loan_statistics": stats
            },
            "updated_overdue_loans": updated_count
        }
        
    except Exception as e:
        logger.error(f"Error getting admin books detailed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"書籍一覧の取得に失敗しました: {str(e)}")


@router.get("/admin/overdue", summary="延滞中の貸出一覧")
def get_overdue_loans(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(50, ge=1, le=100, description="1ページあたりの件数"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """延滞中の貸出一覧を取得"""
    try:
        loan_service = LoanService(db)
        
        # 延滞中のローンを更新
        updated_count = loan_service.update_overdue_loans()
        
        skip = (page - 1) * per_page
        overdue_loans = loan_service.get_overdue_loans(skip=skip, limit=per_page)
        
        return {
            "overdue_loans": overdue_loans,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": len(overdue_loans),  # 簡易実装
                "pages": (len(overdue_loans) + per_page - 1) // per_page
            },
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error(f"Error getting overdue loans: {str(e)}")
        raise HTTPException(status_code=500, detail=f"延滞中の貸出一覧の取得に失敗しました: {str(e)}")


@router.get("/test-filters", summary="フィルターテスト用（認証不要）")
def test_filters(
    status_filter: Optional[str] = Query(None, description="ステータスフィルター: all, available, borrowed, overdue"),
    db: Session = Depends(get_db)
):
    """フィルターのテスト用エンドポイント（認証不要）"""
    try:
        from src.services.loan_service import LoanService
        
        # 延滞中のローンを更新
        loan_service = LoanService(db)
        loan_service.update_overdue_loans()
        
        # 延滞情報を含む書籍データを取得
        books_with_status = loan_service.get_books_with_loan_status(
            skip=0, 
            limit=100, 
            include_overdue_info=True
        )
        
        # フィルター適用前の統計
        all_stats = {
            "total_books": len(books_with_status),
            "available_count": len([b for b in books_with_status if not b["detailed_status"]["is_borrowed"]]),
            "borrowed_count": len([b for b in books_with_status if b["detailed_status"]["is_borrowed"]]),
            "overdue_count": len([b for b in books_with_status if b["detailed_status"]["is_overdue"]])
        }
        
        # ステータスフィルターを適用
        filtered_books = []
        for book in books_with_status:
            if status_filter:
                if status_filter == "available" and book["detailed_status"]["is_borrowed"]:
                    continue
                elif status_filter == "borrowed":
                    # 貸出中: 通常の貸出中 + 延滞中（両方含む）
                    if not book["detailed_status"]["is_borrowed"]:
                        continue
                elif status_filter == "overdue" and not book["detailed_status"]["is_overdue"]:
                    continue
            
            filtered_books.append(book)
        
        return {
            "status_filter": status_filter,
            "all_statistics": all_stats,
            "filtered_count": len(filtered_books),
            "filtered_books": [
                {
                    "title": book["title"][:30],
                    "is_borrowed": book["detailed_status"]["is_borrowed"],
                    "is_overdue": book["detailed_status"]["is_overdue"],
                    "days_overdue": book["detailed_status"].get("days_overdue", 0)
                }
                for book in filtered_books[:10]  # 最初の10冊だけ
            ]
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "status_filter": status_filter
        } 