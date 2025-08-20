"""
統計関連API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, case
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import pytz

from ..database import get_db
from ..models.book import Book
from ..models.loan import Loan, LoanStatus
from ..models.purchase_request import PurchaseRequest, PurchaseRequestStatus
from ..models.reservation import Reservation, ReservationStatus
from ..models.user import User
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", summary="ダッシュボード統計取得")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ダッシュボード用の統計情報を取得"""
    
    # 管理者権限チェック
    role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_value != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    # 基本統計
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_loans = db.query(func.count(Loan.id)).scalar() or 0
    active_loans = db.query(func.count(Loan.id)).filter(Loan.status == "ACTIVE").scalar() or 0
    total_reservations = db.query(func.count(Reservation.id)).scalar() or 0
    pending_requests = db.query(func.count(PurchaseRequest.id)).filter(
        PurchaseRequest.status == "PENDING"
    ).scalar() or 0
    
    return {
        "users": {
            "total": total_users,
            "active": total_users  # 一時的に全ユーザーをアクティブとして扱う
        },
        "loans": {
            "total": total_loans,
            "active": active_loans
        },
        "reservations": {
            "total": total_reservations
        },
        "purchase_requests": {
            "pending": pending_requests
        }
    }


@router.get("/user/{user_id}", summary="ユーザー固有統計取得")
async def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    
    # 管理者権限チェック
    role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_value != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    # ユーザー存在確認
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 貸出統計
    total_loans = db.query(func.count(Loan.id)).filter(Loan.user_id == user_id).scalar() or 0
    active_loans = db.query(func.count(Loan.id)).filter(
        and_(Loan.user_id == user_id, Loan.status == "ACTIVE")
    ).scalar() or 0
    overdue_loans = db.query(func.count(Loan.id)).filter(
        and_(
            Loan.user_id == user_id, 
            Loan.status == "ACTIVE",
            Loan.due_date < datetime.now().date()
        )
    ).scalar() or 0
    
    # 予約統計
    total_reservations = db.query(func.count(Reservation.id)).filter(
        Reservation.user_id == user_id
    ).scalar() or 0
    active_reservations = db.query(func.count(Reservation.id)).filter(
        and_(Reservation.user_id == user_id, Reservation.status == "PENDING")
    ).scalar() or 0
    
    # 購入申請統計
    total_requests = db.query(func.count(PurchaseRequest.id)).filter(
        PurchaseRequest.user_id == user_id
    ).scalar() or 0
    pending_requests = db.query(func.count(PurchaseRequest.id)).filter(
        and_(PurchaseRequest.user_id == user_id, PurchaseRequest.status == "PENDING")
    ).scalar() or 0
    approved_requests = db.query(func.count(PurchaseRequest.id)).filter(
        and_(PurchaseRequest.user_id == user_id, PurchaseRequest.status == "APPROVED")
    ).scalar() or 0
    
    return {
        "user_id": user_id,
        "loans": {
            "total": total_loans,
            "active": active_loans,
            "overdue": overdue_loans
        },
        "reservations": {
            "total": total_reservations,
            "active": active_reservations
        },
        "purchase_requests": {
            "total": total_requests,
            "pending": pending_requests,
            "approved": approved_requests
        }
    }


@router.get("/reading-stats", summary="期間別読書統計取得")
async def get_reading_stats(
    period_type: str = Query(..., description="期間タイプ ('month' または 'year')"),
    period_value: str = Query(..., description="期間値 (例: '2025-07' または '2025')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """期間別読書統計（ユーザー別・書籍別ランキング）を取得"""
    
    # 管理者権限チェック
    role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_value != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    try:
        # 期間の解析
        if period_type == "month":
            # 月別統計 (例: "2025-07")
            year, month = map(int, period_value.split('-'))
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date()
            else:
                end_date = datetime(year, month + 1, 1).date()
        elif period_type == "year":
            # 年別統計 (例: "2025")
            year = int(period_value)
            start_date = datetime(year, 1, 1).date()
            end_date = datetime(year + 1, 1, 1).date()
        else:
            raise HTTPException(status_code=400, detail="無効な期間タイプです")
        
        # ユーザー別読書統計（返却完了分のみ）
        user_stats_query = db.query(
            User.id.label('user_id'),
            User.username.label('user_name'),
            User.full_name.label('full_name'),
            User.department.label('department'),
            func.count(Loan.id).label('completed_reads')
        ).join(
            Loan, User.id == Loan.user_id
        ).filter(
            and_(
                Loan.return_date.isnot(None),  # 返却済みのみ
                Loan.return_date >= start_date,
                Loan.return_date < end_date
            )
        ).group_by(
            User.id, User.username, User.full_name, User.department
        ).order_by(
            func.count(Loan.id).desc()
        )
        
        user_stats = user_stats_query.all()
        
        # 各ユーザーの現在の貸出中の本数を取得
        active_loans_per_user = {}
        active_loans_query = db.query(
            Loan.user_id,
            func.count(Loan.id).label('active_count')
        ).filter(
            Loan.status == LoanStatus.ACTIVE
        ).group_by(Loan.user_id)
        
        for result in active_loans_query.all():
            active_loans_per_user[result.user_id] = result.active_count
        
        # 書籍別読書統計（返却完了分のみ）
        book_stats_query = db.query(
            Book.id.label('book_id'),
            Book.title.label('title'),
            Book.author.label('author'),
            func.count(Loan.id).label('completed_reads')
        ).join(
            Loan, Book.id == Loan.book_id
        ).filter(
            and_(
                Loan.return_date.isnot(None),  # 返却済みのみ
                Loan.return_date >= start_date,
                Loan.return_date < end_date
            )
        ).group_by(
            Book.id, Book.title, Book.author
        ).order_by(
            func.count(Loan.id).desc()
        )
        
        book_stats = book_stats_query.all()
        
        # 各書籍の現在の貸出中の数を取得
        current_loans_per_book = {}
        current_loans_query = db.query(
            Loan.book_id,
            func.count(Loan.id).label('current_count')
        ).filter(
            Loan.status == LoanStatus.ACTIVE
        ).group_by(Loan.book_id)
        
        for result in current_loans_query.all():
            current_loans_per_book[result.book_id] = result.current_count
        
        # 延滞中の貸出データ
        overdue_loans_query = db.query(
            Loan.id,
            User.id.label('user_id'),
            User.username.label('user_name'),
            User.email.label('user_email'),
            Book.id.label('book_id'),
            Book.title.label('book_title'),
            Book.author.label('book_author'),
            Loan.loan_date,
            Loan.due_date,
(func.extract('epoch', func.now() - Loan.due_date) / 86400.0).label('days_overdue')
        ).join(
            User, Loan.user_id == User.id
        ).join(
            Book, Loan.book_id == Book.id
        ).filter(
            and_(
                Loan.status == LoanStatus.ACTIVE,
                Loan.due_date < datetime.now().date()
            )
        )
        
        overdue_loans = overdue_loans_query.all()
        
        return {
            "user_stats": [
                {
                    "user_id": stat.user_id,
                    "user_name": stat.user_name,
                    "full_name": stat.full_name,
                    "department": stat.department or "不明",
                    "completed_reads": int(stat.completed_reads),
                    "active_loans": active_loans_per_user.get(stat.user_id, 0)
                }
                for stat in user_stats
            ],
            "book_stats": [
                {
                    "book_id": stat.book_id,
                    "title": stat.title,
                    "author": stat.author,
                    "completed_reads": int(stat.completed_reads),
                    "current_loans": current_loans_per_book.get(stat.book_id, 0)
                }
                for stat in book_stats
            ],
            "overdue_loans": [
                {
                    "id": loan.id,
                    "user_id": loan.user_id,
                    "user_name": loan.user_name,
                    "user_email": loan.user_email,
                    "book_id": loan.book_id,
                    "book_title": loan.book_title,
                    "book_author": loan.book_author,
                    "borrowed_at": loan.loan_date.isoformat() if loan.loan_date else None,
                    "due_date": loan.due_date.isoformat() if loan.due_date else None,
                    "days_overdue": int(loan.days_overdue) if loan.days_overdue else 0
                }
                for loan in overdue_loans
            ]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"無効な期間値です: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"統計取得エラー: {str(e)}")


@router.get("/debug/book-status", summary="書籍ステータスデバッグ")
def get_debug_book_status(db: Session = Depends(get_db)):
    """書籍ステータスのデバッグ情報を取得"""
    try:
        # データベースから書籍情報を取得
        books = db.query(Book).limit(10).all()  # 最初の10冊を取得
        
        debug_info = []
        for book in books:
            debug_info.append({
                "id": book.id,
                "title": book.title,
                "status": book.status,
                "is_available": book.status == 'AVAILABLE',
                "total_copies": book.total_copies,
                "available_copies": book.available_copies
            })
        
        # 統計情報
        total_count = db.query(func.count(Book.id)).scalar() or 0
        available_count = db.query(func.count(Book.id)).filter(Book.status == 'AVAILABLE').scalar() or 0
        borrowed_count = total_count - available_count
        
        return {
            "books": debug_info,
            "total_count": total_count,
            "available_count": available_count,
            "borrowed_count": borrowed_count
        }
        
    except Exception as e:
        print(f"デバッグ情報取得エラー: {e}")
        return {
            "books": [],
            "total_count": 0,
            "available_count": 0,
            "borrowed_count": 0,
            "error": str(e)
        } 