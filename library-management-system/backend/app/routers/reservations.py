from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.models import Reservation
from app.data.store import reservation_store, book_store, user_store, reserve_book, cancel_reservation
from pydantic import BaseModel

router = APIRouter()

class ReservationCreate(BaseModel):
    book_id: int
    user_id: int

class ReservationCancel(BaseModel):
    reservation_id: int

@router.get("/", response_model=List[Reservation])
async def get_reservations(
    user_id: Optional[int] = None,
    book_id: Optional[int] = None,
    active_only: bool = True
):
    """
    予約一覧を取得
    ユーザーIDまたは書籍IDで絞り込み可能
    デフォルトではアクティブな予約のみを返す
    """
    reservations = reservation_store.get_all()
    
    # 絞り込み条件の適用
    if user_id is not None:
        reservations = [reservation for reservation in reservations if reservation.user_id == user_id]
    
    if book_id is not None:
        reservations = [reservation for reservation in reservations if reservation.book_id == book_id]
    
    if active_only:
        reservations = [reservation for reservation in reservations if reservation.is_active]
    
    return reservations

@router.get("/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: int):
    """
    特定の予約を取得
    """
    reservation = reservation_store.get_by_id(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="予約が見つかりません")
    return reservation

@router.post("/", response_model=Reservation)
async def create_reservation(reservation_data: ReservationCreate):
    """
    新しい予約を作成
    """
    # ユーザーの存在確認
    user = user_store.get_by_id(reservation_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 書籍の存在確認
    book = book_store.get_by_id(reservation_data.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    # 書籍が利用可能な場合は予約不要
    if book.is_available:
        raise HTTPException(status_code=400, detail="この書籍は現在利用可能です。予約ではなく直接借りることができます。")
    
    # 既に同じ本を借りている場合は予約不可
    if book.current_borrower_id == reservation_data.user_id:
        raise HTTPException(status_code=400, detail="あなたは既にこの書籍を借りています")
    
    # 既に同じ本を予約している場合は予約不可
    existing_reservations = reservation_store.filter(
        book_id=reservation_data.book_id,
        user_id=reservation_data.user_id,
        is_active=True
    )
    if existing_reservations:
        raise HTTPException(status_code=400, detail="あなたは既にこの書籍を予約しています")
    
    # 予約処理を実行
    new_reservation = reserve_book(reservation_data.book_id, reservation_data.user_id)
    if not new_reservation:
        raise HTTPException(status_code=500, detail="予約処理に失敗しました")
    
    return new_reservation

@router.post("/cancel")
async def cancel_reservation_endpoint(cancel_data: ReservationCancel):
    """
    予約をキャンセル
    """
    # 予約の存在確認
    reservation = reservation_store.get_by_id(cancel_data.reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="予約が見つかりません")
    
    # 既にキャンセルされている場合はエラー
    if not reservation.is_active:
        raise HTTPException(status_code=400, detail="この予約は既にキャンセルされています")
    
    # キャンセル処理を実行
    success = cancel_reservation(cancel_data.reservation_id)
    if not success:
        raise HTTPException(status_code=500, detail="予約のキャンセルに失敗しました")
    
    return {"message": "予約をキャンセルしました", "reservation_id": cancel_data.reservation_id}

@router.get("/book/{book_id}/queue", response_model=List[Reservation])
async def get_reservation_queue(book_id: int):
    """
    特定の書籍の予約キューを取得
    """
    # 書籍の存在確認
    book = book_store.get_by_id(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    # アクティブな予約を取得して順位でソート
    reservations = reservation_store.filter(book_id=book_id, is_active=True)
    sorted_reservations = sorted(reservations, key=lambda r: r.position)
    
    return sorted_reservations

@router.get("/user/{user_id}", response_model=List[Reservation])
async def get_user_reservations(user_id: int, active_only: bool = True):
    """
    ユーザーの予約一覧を取得
    """
    # ユーザーの存在確認
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 予約を取得
    filters = {"user_id": user_id}
    if active_only:
        filters["is_active"] = True
    
    reservations = reservation_store.filter(**filters)
    
    return reservations 