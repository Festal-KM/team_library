from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.models import Book
from app.data.store import book_store, reservation_store, loan_store
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class BookCreate(BaseModel):
    title: str
    author: str
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    price: Optional[float] = None
    page_count: Optional[int] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    price: Optional[float] = None
    page_count: Optional[int] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None

@router.get("/", response_model=List[Book])
async def get_books(
    title: Optional[str] = None,
    author: Optional[str] = None,
    category: Optional[str] = None,
    available_only: bool = False
):
    """
    書籍一覧を取得
    オプションでタイトル、著者、カテゴリーで絞り込み可能
    """
    books = book_store.get_all()
    
    # 絞り込み条件の適用
    if title:
        books = [book for book in books if title.lower() in book.title.lower()]
    
    if author:
        books = [book for book in books if author.lower() in book.author.lower()]
    
    if category:
        books = [book for book in books if book.category and category.lower() in book.category.lower()]
    
    if available_only:
        books = [book for book in books if book.is_available]
    
    return books

@router.get("/{book_id}", response_model=Book)
async def get_book(book_id: int):
    """
    書籍の詳細情報を取得
    """
    book = book_store.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    return book

@router.post("/", response_model=Book)
async def create_book(book: BookCreate):
    """
    新しい書籍を登録
    """
    # 既存のISBNと重複しないか確認（ISBNがある場合）
    if book.isbn:
        existing_books = book_store.get_all()
        for existing_book in existing_books:
            if existing_book.isbn == book.isbn:
                raise HTTPException(status_code=400, detail=f"ISBN {book.isbn} の書籍は既に登録されています")
    
    # 新しい書籍を作成
    book_data = book.model_dump()
    return book_store.create(book_data)

@router.put("/{book_id}", response_model=Book)
async def update_book(book_id: int, book_update: BookUpdate):
    """
    書籍情報を更新
    """
    existing_book = book_store.get_by_id(book_id)
    if not existing_book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    # 更新するデータを準備（Noneでないフィールドのみ）
    update_data = {k: v for k, v in book_update.model_dump().items() if v is not None}
    
    # 更新を実行
    updated_book = book_store.update(book_id, update_data)
    if not updated_book:
        raise HTTPException(status_code=500, detail="書籍の更新に失敗しました")
    
    return updated_book

@router.delete("/{book_id}")
async def delete_book(book_id: int):
    """
    書籍を強制削除（貸出中・予約中でも削除可能）
    """
    existing_book = book_store.get_by_id(book_id)
    if not existing_book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    # 貸出中の場合は強制返却
    active_loans = []
    if not existing_book.is_available and existing_book.current_borrower_id:
        # 強制返却処理
        active_loans = loan_store.filter(book_id=book_id, is_returned=False)
        for loan in active_loans:
            loan.is_returned = True
            loan.return_date = datetime.now().date()
            loan.notes = f"書籍削除により強制返却 (削除日: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})"
            loan_store.update(loan.id, loan.__dict__)
    
    # 予約がある場合はキャンセル
    reservations = reservation_store.filter(book_id=book_id, is_active=True)
    for reservation in reservations:
        reservation.is_active = False
        reservation.notes = f"書籍削除によりキャンセル (削除日: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})"
        reservation_store.update(reservation.id, reservation.__dict__)
    
    # 削除実行
    success = book_store.delete(book_id)
    if not success:
        raise HTTPException(status_code=500, detail="書籍の削除に失敗しました")
    
    return {"message": f"書籍を削除しました（貸出{len(active_loans)}件返却、予約{len(reservations)}件キャンセル）", "id": book_id}

@router.get("/{book_id}/reservations/count")
async def get_reservation_count(book_id: int):
    """
    書籍の予約数を取得
    """
    book = book_store.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    reservations = reservation_store.filter(book_id=book_id, is_active=True)
    return {"book_id": book_id, "reservation_count": len(reservations)} 