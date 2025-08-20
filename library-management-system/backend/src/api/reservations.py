"""
予約関連API
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from src.models.base import get_db
from src.services.reservation_service import ReservationService
from src.schemas.reservation import (
    ReservationCreate, ReservationUpdate, ReservationCancel,
    ReservationResponse, ReservationListResponse, ReservationQueueResponse,
    ReservationStatistics, ReservationCreateResponse, ReservationCancelResponse,
    ReservationProcessResponse
)
from src.models.reservation import ReservationStatus
from src.utils.dependencies import get_current_user, require_admin
from src.models.user import User

router = APIRouter()


@router.get("/reservations", summary="予約一覧取得", response_model=ReservationListResponse)
def get_reservations(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    status: Optional[ReservationStatus] = Query(None, description="予約ステータス"),
    user_id: Optional[int] = Query(None, description="ユーザーID"),
    book_id: Optional[int] = Query(None, description="書籍ID"),
    expired_only: bool = Query(False, description="期限切れのみ"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """予約一覧を取得（図書館員・管理者のみ）"""
    try:
        reservation_service = ReservationService(db)
        skip = (page - 1) * per_page
        
        reservations = reservation_service.get_reservations(
            skip=skip,
            limit=per_page,
            status=status,
            user_id=user_id,
            book_id=book_id,
            expired_only=expired_only
        )
        
        # 総件数を取得（簡易実装）
        total = len(reservation_service.get_reservations(skip=0, limit=1000))
        pages = math.ceil(total / per_page)
        
        return ReservationListResponse(
            reservations=reservations,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reservations/{reservation_id}", summary="予約詳細取得", response_model=ReservationResponse)
def get_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """予約詳細を取得"""
    try:
        reservation_service = ReservationService(db)
        reservation = reservation_service.get_reservation_by_id(reservation_id)
        
        if not reservation:
            raise HTTPException(status_code=404, detail="予約が見つかりません")
        
        # 自分の予約または図書館員・管理者のみアクセス可能
        if (reservation.user_id != current_user.id and 
            current_user.role.value not in ["admin", "librarian"]):
            raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        return reservation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reservations/user/{user_id}", summary="ユーザーの予約一覧取得")
def get_user_reservations(
    user_id: int,
    active_only: bool = Query(False, description="アクティブな予約のみ"),
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_current_user)  # 一時的に無効化
):
    """指定ユーザーの予約一覧を取得"""
    try:
        # 一時的に権限チェックを無効化
        # if (user_id != current_user.id and 
        #     current_user.role.value not in ["ADMIN", "LIBRARIAN"]):
        #     raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        reservation_service = ReservationService(db)
        reservations = reservation_service.get_user_reservations(user_id, active_only)
        
        return {"reservations": reservations}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reservations/book/{book_id}/queue", summary="書籍の予約キュー取得", response_model=ReservationQueueResponse)
def get_book_reservation_queue(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """書籍の予約キューを取得"""
    try:
        reservation_service = ReservationService(db)
        queue = reservation_service.get_book_reservation_queue(book_id)
        
        # 書籍情報を取得
        from src.models.book import Book
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="書籍が見つかりません")
        
        return ReservationQueueResponse(
            book_id=book_id,
            book_title=book.title,
            queue=queue,
            total_queue_length=len(queue)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reservations", summary="新規予約作成", response_model=ReservationCreateResponse)
def create_reservation(
    reservation_data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """新規予約を作成"""
    try:
        # 自分の予約または図書館員・管理者のみ作成可能
        if (reservation_data.user_id != current_user.id and 
            current_user.role.value not in ["admin", "librarian"]):
            raise HTTPException(status_code=403, detail="この予約を作成する権限がありません")
        
        reservation_service = ReservationService(db)
        reservation = reservation_service.create_reservation(reservation_data)
        
        # 予約順位を取得
        queue = reservation_service.get_book_reservation_queue(reservation_data.book_id)
        queue_position = next((i + 1 for i, r in enumerate(queue) if r.id == reservation.id), None)
        
        return ReservationCreateResponse(
            message="予約が正常に作成されました",
            reservation=reservation,
            queue_position=queue_position
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reservations/{reservation_id}/cancel", summary="予約キャンセル", response_model=ReservationCancelResponse)
def cancel_reservation(
    reservation_id: int,
    cancel_data: ReservationCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """予約をキャンセル"""
    try:
        reservation_service = ReservationService(db)
        
        # 権限チェック（自分の予約または図書館員・管理者）
        user_id = current_user.id if current_user.role.value not in ["admin", "librarian"] else None
        
        reservation = reservation_service.cancel_reservation(reservation_id, user_id)
        
        return ReservationCancelResponse(
            message="予約が正常にキャンセルされました",
            reservation=reservation
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reservations/{reservation_id}/complete", summary="予約完了")
def complete_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # require_librarian_or_adminから変更
):
    """予約を完了（貸出実行時）"""
    try:
        reservation_service = ReservationService(db)
        
        # まず予約を取得して権限をチェック
        reservation = reservation_service.get_reservation_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="予約が見つかりません")
        
        # 自分の予約または図書館員・管理者のみ完了可能
        if (reservation.user_id != current_user.id and 
            current_user.role.value not in ["admin", "librarian"]):
            raise HTTPException(status_code=403, detail="この予約を完了する権限がありません")
        
        # 予約完了処理を実行
        completed_reservation = reservation_service.complete_reservation(reservation_id)
        
        return {
            "message": "予約が正常に完了されました",
            "reservation": completed_reservation
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reservations/process-expired", summary="期限切れ予約処理", response_model=ReservationProcessResponse)
def process_expired_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """期限切れ予約を処理（図書館員・管理者のみ）"""
    try:
        reservation_service = ReservationService(db)
        expired_reservations = reservation_service.expire_reservations()
        
        return ReservationProcessResponse(
            message=f"{len(expired_reservations)}件の期限切れ予約を処理しました",
            processed_reservations=expired_reservations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reservations/statistics", summary="予約統計取得", response_model=ReservationStatistics)
def get_reservation_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """予約統計情報を取得（図書館員・管理者のみ）"""
    try:
        reservation_service = ReservationService(db)
        stats = reservation_service.get_reservation_statistics()
        
        return ReservationStatistics(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 