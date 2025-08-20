"""
予約サービス - ビジネスロジック層
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import logging

from src.models.reservation import Reservation, ReservationStatus
from src.models.book import Book, BookStatus
from src.models.user import User
from src.models.loan import Loan, LoanStatus
from src.schemas.reservation import ReservationCreate, ReservationUpdate, ReservationResponse

logger = logging.getLogger(__name__)


class ReservationService:
    """予約サービスクラス"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_reservations(
        self, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[ReservationStatus] = None,
        user_id: Optional[int] = None,
        book_id: Optional[int] = None,
        expired_only: bool = False
    ) -> List[ReservationResponse]:
        """予約一覧を取得"""
        query = self.db.query(Reservation).options(
            joinedload(Reservation.user),
            joinedload(Reservation.book)
        )
        
        # フィルタリング
        if status:
            query = query.filter(Reservation.status == status)
        
        if user_id:
            query = query.filter(Reservation.user_id == user_id)
        
        if book_id:
            query = query.filter(Reservation.book_id == book_id)
        
        if expired_only:
            query = query.filter(
                and_(
                    Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY]),
                    Reservation.expiry_date < date.today()
                )
            )
        
        # 予約日順でソート
        reservations = query.order_by(Reservation.reservation_date).offset(skip).limit(limit).all()
        return [ReservationResponse.model_validate(reservation) for reservation in reservations]
    
    def get_reservation_by_id(self, reservation_id: int) -> Optional[ReservationResponse]:
        """IDで予約を取得"""
        reservation = self.db.query(Reservation).options(
            joinedload(Reservation.user),
            joinedload(Reservation.book)
        ).filter(Reservation.id == reservation_id).first()
        if reservation:
            return ReservationResponse.model_validate(reservation)
        return None
    
    def get_user_reservations(self, user_id: int, active_only: bool = False) -> List[ReservationResponse]:
        """ユーザーの予約を取得"""
        query = self.db.query(Reservation).options(
            joinedload(Reservation.user),
            joinedload(Reservation.book)
        ).filter(Reservation.user_id == user_id)
        
        if active_only:
            query = query.filter(
                Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
            )
        
        reservations = query.order_by(Reservation.reservation_date.desc()).all()
        return [ReservationResponse.model_validate(reservation) for reservation in reservations]
    
    def get_book_reservation_queue(self, book_id: int) -> List[ReservationResponse]:
        """書籍の予約キューを取得"""
        reservations = self.db.query(Reservation).options(
            joinedload(Reservation.user),
            joinedload(Reservation.book)
        ).filter(
            and_(
                Reservation.book_id == book_id,
                Reservation.status == ReservationStatus.PENDING
            )
        ).order_by(Reservation.priority, Reservation.reservation_date).all()
        
        return [ReservationResponse.model_validate(reservation) for reservation in reservations]
    
    def create_reservation(self, reservation_data: ReservationCreate) -> ReservationResponse:
        """新しい予約を作成"""
        # 書籍の存在確認
        book = self.db.query(Book).filter(Book.id == reservation_data.book_id).first()
        if not book:
            raise ValueError("指定された書籍が見つかりません")
        
        # ユーザーの存在確認
        user = self.db.query(User).filter(User.id == reservation_data.user_id).first()
        if not user:
            raise ValueError("指定されたユーザーが見つかりません")
        
        # 既に同じ書籍を借りているかチェック
        existing_loan = self.db.query(Loan).filter(
            and_(
                Loan.user_id == reservation_data.user_id,
                Loan.book_id == reservation_data.book_id,
                Loan.status == LoanStatus.ACTIVE
            )
        ).first()
        
        if existing_loan:
            raise ValueError("この書籍は既に借りています")
        
        # 既に同じ書籍を予約しているかチェック
        existing_reservation = self.db.query(Reservation).filter(
            and_(
                Reservation.user_id == reservation_data.user_id,
                Reservation.book_id == reservation_data.book_id,
                Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
            )
        ).first()
        
        if existing_reservation:
            raise ValueError("この書籍は既に予約しています")
        
        # ユーザーの予約制限チェック
        active_reservations_count = self.db.query(Reservation).filter(
            and_(
                Reservation.user_id == reservation_data.user_id,
                Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
            )
        ).count()
        
        max_reservations = 3  # 最大予約数
        if active_reservations_count >= max_reservations:
            raise ValueError(f"予約上限（{max_reservations}冊）に達しています")
        
        # 予約順位を決定
        next_priority = self.db.query(func.max(Reservation.priority)).filter(
            and_(
                Reservation.book_id == reservation_data.book_id,
                Reservation.status == ReservationStatus.PENDING
            )
        ).scalar() or 0
        next_priority += 1
        
        # 予約期限を設定（デフォルト7日後）
        expiry_days = reservation_data.expiry_days or 7
        expiry_date = date.today() + timedelta(days=expiry_days)
        
        # 書籍が利用可能な場合は即座にREADY状態にする
        initial_status = ReservationStatus.READY if book.status == BookStatus.AVAILABLE else ReservationStatus.PENDING
        
        # 予約レコードを作成
        reservation = Reservation(
            user_id=reservation_data.user_id,
            book_id=reservation_data.book_id,
            reservation_date=date.today(),
            expiry_date=expiry_date,
            status=initial_status,
            priority=next_priority,
            notes=reservation_data.notes
        )
        
        self.db.add(reservation)
        self.db.commit()
        self.db.refresh(reservation)
        
        logger.info(f"新規予約作成: ユーザー{reservation_data.user_id}, 書籍{reservation_data.book_id}")
        return ReservationResponse.model_validate(reservation)
    
    def cancel_reservation(self, reservation_id: int, user_id: Optional[int] = None) -> ReservationResponse:
        """予約をキャンセル"""
        reservation = self.db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise ValueError("指定された予約が見つかりません")
        
        # ユーザーIDが指定されている場合は権限チェック
        if user_id and reservation.user_id != user_id:
            raise ValueError("この予約をキャンセルする権限がありません")
        
        if reservation.status not in [ReservationStatus.PENDING, ReservationStatus.READY]:
            raise ValueError("この予約はキャンセルできません")
        
        # 予約をキャンセル
        reservation.status = ReservationStatus.CANCELLED
        
        # 後続の予約の順位を繰り上げ
        self._update_reservation_priorities(reservation.book_id)
        
        self.db.commit()
        self.db.refresh(reservation)
        
        logger.info(f"予約キャンセル: 予約ID{reservation_id}")
        return ReservationResponse.model_validate(reservation)
    
    def complete_reservation(self, reservation_id: int) -> ReservationResponse:
        """予約を完了（貸出実行時）"""
        reservation = self.db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise ValueError("指定された予約が見つかりません")
        
        if reservation.status != ReservationStatus.READY:
            raise ValueError("この予約は完了できません")
        
        # 予約を完了
        reservation.status = ReservationStatus.COMPLETED
        
        # 後続の予約の順位を繰り上げ
        self._update_reservation_priorities(reservation.book_id)
        
        self.db.commit()
        self.db.refresh(reservation)
        
        logger.info(f"予約完了: 予約ID{reservation_id}")
        return ReservationResponse.model_validate(reservation)
    
    def process_book_return(self, book_id: int) -> Optional[ReservationResponse]:
        """書籍返却時の予約処理"""
        # 最優先の予約を取得
        next_reservation = self.db.query(Reservation).options(
            joinedload(Reservation.user),
            joinedload(Reservation.book)
        ).filter(
            and_(
                Reservation.book_id == book_id,
                Reservation.status == ReservationStatus.PENDING
            )
        ).order_by(Reservation.priority, Reservation.reservation_date).first()
        
        if next_reservation:
            # 予約をREADY状態にする
            next_reservation.status = ReservationStatus.READY
            # 新しい期限を設定（3日後）
            next_reservation.expiry_date = date.today() + timedelta(days=3)
            
            # 後続の予約の順位を繰り上げ
            self._update_reservation_priorities(book_id)
            
            self.db.commit()
            self.db.refresh(next_reservation)
            
            logger.info(f"予約準備完了: 予約ID{next_reservation.id}, ユーザーID{next_reservation.user_id}")
            return ReservationResponse.model_validate(next_reservation)
        
        return None
    
    def expire_reservations(self) -> List[ReservationResponse]:
        """期限切れ予約を処理"""
        expired_reservations = self.db.query(Reservation).filter(
            and_(
                Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY]),
                Reservation.expiry_date < date.today()
            )
        ).all()
        
        expired_list = []
        for reservation in expired_reservations:
            reservation.status = ReservationStatus.EXPIRED
            expired_list.append(ReservationResponse.model_validate(reservation))
            
            # 後続の予約の順位を繰り上げ
            self._update_reservation_priorities(reservation.book_id)
        
        if expired_reservations:
            self.db.commit()
            logger.info(f"期限切れ予約処理: {len(expired_reservations)}件")
        
        return expired_list
    
    def _update_reservation_priorities(self, book_id: int):
        """予約順位を更新"""
        pending_reservations = self.db.query(Reservation).filter(
            and_(
                Reservation.book_id == book_id,
                Reservation.status == ReservationStatus.PENDING
            )
        ).order_by(Reservation.priority, Reservation.reservation_date).all()
        
        for i, reservation in enumerate(pending_reservations, 1):
            reservation.priority = i
    
    def get_reservation_statistics(self) -> Dict[str, Any]:
        """予約統計情報を取得"""
        total_reservations = self.db.query(Reservation).count()
        pending_reservations = self.db.query(Reservation).filter(
            Reservation.status == ReservationStatus.PENDING
        ).count()
        ready_reservations = self.db.query(Reservation).filter(
            Reservation.status == ReservationStatus.READY
        ).count()
        completed_reservations = self.db.query(Reservation).filter(
            Reservation.status == ReservationStatus.COMPLETED
        ).count()
        cancelled_reservations = self.db.query(Reservation).filter(
            Reservation.status == ReservationStatus.CANCELLED
        ).count()
        expired_reservations = self.db.query(Reservation).filter(
            Reservation.status == ReservationStatus.EXPIRED
        ).count()
        
        return {
            "total_reservations": total_reservations,
            "pending_reservations": pending_reservations,
            "ready_reservations": ready_reservations,
            "completed_reservations": completed_reservations,
            "cancelled_reservations": cancelled_reservations,
            "expired_reservations": expired_reservations,
            "completion_rate": round((completed_reservations / total_reservations * 100) if total_reservations > 0 else 0, 2)
        }
    
    def create_notification(self, user_id: int, message: str, notification_type: str = "reservation"):
        """通知を作成（基本版）"""
        # 現在はログ出力のみ。将来的にデータベースに保存
        logger.info(f"通知作成: ユーザーID{user_id}, タイプ{notification_type}, メッセージ: {message}")
        
        # TODO: 将来的に以下を実装
        # - 通知テーブルへの保存
        # - メール送信
        # - プッシュ通知
        # - システム内通知バッジ 