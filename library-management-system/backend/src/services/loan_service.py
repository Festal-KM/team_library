"""
貸出サービス - ビジネスロジック層
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import logging

from src.models.loan import Loan, LoanStatus
from src.models.book import Book, BookStatus
from src.models.user import User
from src.schemas.loan import LoanCreate, LoanUpdate, LoanResponse

logger = logging.getLogger(__name__)


class LoanService:
    """貸出サービスクラス"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_loans(
        self, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[LoanStatus] = None,
        user_id: Optional[int] = None,
        book_id: Optional[int] = None,
        overdue_only: bool = False
    ) -> List[LoanResponse]:
        """貸出一覧を取得"""
        query = self.db.query(Loan)
        
        # フィルタリング
        if status:
            query = query.filter(Loan.status == status)
        
        if user_id:
            query = query.filter(Loan.user_id == user_id)
        
        if book_id:
            query = query.filter(Loan.book_id == book_id)
        
        if overdue_only:
            query = query.filter(
                and_(
                    Loan.status == LoanStatus.ACTIVE,
                    Loan.due_date < date.today()
                )
            )
        
        loans = query.offset(skip).limit(limit).all()
        return [LoanResponse.model_validate(loan) for loan in loans]
    
    def get_loan_by_id(self, loan_id: int) -> Optional[LoanResponse]:
        """IDで貸出を取得"""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if loan:
            return LoanResponse.model_validate(loan)
        return None
    
    def get_user_active_loans(self, user_id: int) -> List[LoanResponse]:
        """ユーザーのアクティブな貸出を取得（書籍情報を含む）"""
        from src.models.book import Book
        from src.models.user import User
        
        loans = self.db.query(Loan).join(Book).join(User).filter(
            and_(
                Loan.user_id == user_id,
                Loan.status == LoanStatus.ACTIVE
            )
        ).all()
        
        # 関連データを含むレスポンスを作成
        result = []
        for loan in loans:
            loan_dict = {
                "id": loan.id,
                "user_id": loan.user_id,
                "book_id": loan.book_id,
                "loan_date": loan.loan_date,
                "due_date": loan.due_date,
                "return_date": loan.return_date,
                "status": loan.status,
                "renewal_count": loan.renewal_count or 0,
                "notes": loan.notes,
                "created_at": loan.created_at,
                "updated_at": loan.updated_at,
                "book": {
                    "id": loan.book.id,
                    "title": loan.book.title,
                    "author": loan.book.author,
                    "isbn": loan.book.isbn,
                    "status": loan.book.status,
                    "image_url": loan.book.image_url
                } if loan.book else None,
                "user": {
                    "id": loan.user.id,
                    "full_name": loan.user.full_name,
                    "email": loan.user.email
                } if loan.user else None
            }
            result.append(LoanResponse.model_validate(loan_dict))
        
        return result
    
    def get_user_overdue_loans(self, user_id: int) -> List[LoanResponse]:
        """ユーザーの期限切れ貸出を取得"""
        loans = self.db.query(Loan).filter(
            and_(
                Loan.user_id == user_id,
                Loan.status == LoanStatus.ACTIVE,
                Loan.due_date < date.today()
            )
        ).all()
        return [LoanResponse.model_validate(loan) for loan in loans]
    
    def create_loan(self, loan_data: LoanCreate) -> LoanResponse:
        """新しい貸出を作成"""
        # 書籍の利用可能性をチェック
        book = self.db.query(Book).filter(Book.id == loan_data.book_id).first()
        if not book:
            raise ValueError("指定された書籍が見つかりません")
        
        # ユーザーの存在確認
        user = self.db.query(User).filter(User.id == loan_data.user_id).first()
        if not user:
            raise ValueError("指定されたユーザーが見つかりません")
        
        # 書籍のステータスチェック
        book_status = book.status.upper() if isinstance(book.status, str) else book.status.value.upper()
        
        if book_status == "AVAILABLE":
            # 通常の貸出処理
            pass
        elif book_status == "RESERVED":
            # 予約準備完了の書籍の場合、該当ユーザーの予約があるかチェック
            from src.models.reservation import Reservation, ReservationStatus
            user_reservation = self.db.query(Reservation).filter(
                and_(
                    Reservation.book_id == loan_data.book_id,
                    Reservation.user_id == loan_data.user_id,
                    Reservation.status == ReservationStatus.READY
                )
            ).first()
            
            if not user_reservation:
                # 現在の予約者数を取得
                pending_reservations_count = self.db.query(Reservation).filter(
                    and_(
                        Reservation.book_id == loan_data.book_id,
                        Reservation.status.in_([ReservationStatus.PENDING, ReservationStatus.READY])
                    )
                ).count()
                
                if pending_reservations_count > 0:
                    raise ValueError(f"この書籍は他の利用者が予約しており、現在予約者専用となっています。（予約待ち: {pending_reservations_count}人）予約をしてお待ちください。")
                else:
                    raise ValueError("この書籍は現在貸出できません。")
        else:
            raise ValueError("この書籍は現在貸出できません")
        
        # ユーザーの貸出制限チェック
        active_loans_count = self.db.query(Loan).filter(
            and_(
                Loan.user_id == loan_data.user_id,
                Loan.status == LoanStatus.ACTIVE
            )
        ).count()
        
        max_loans = 5  # 最大貸出冊数
        if active_loans_count >= max_loans:
            raise ValueError(f"貸出上限（{max_loans}冊）に達しています")
        
        # 期限切れ貸出がある場合は新規貸出を拒否
        overdue_loans = self.get_user_overdue_loans(loan_data.user_id)
        if overdue_loans:
            raise ValueError("返却期限切れの書籍があるため、新規貸出はできません")
        
        # 貸出期間の計算（デフォルト14日）
        loan_period = loan_data.loan_period or 14
        due_date = date.today() + timedelta(days=loan_period)
        
        # 貸出レコードを作成
        loan = Loan(
            user_id=loan_data.user_id,
            book_id=loan_data.book_id,
            loan_date=date.today(),
            due_date=due_date,
            status=LoanStatus.ACTIVE,
            notes=loan_data.notes
        )
        
        # 書籍のステータスを更新（データベースの形式に合わせて文字列で保存）
        book.status = "BORROWED"
        book.available_copies = max(0, book.available_copies - 1)
        
        self.db.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        
        logger.info(f"新規貸出作成: ユーザー{loan_data.user_id}, 書籍{loan_data.book_id}")
        return LoanResponse.model_validate(loan)
    
    def return_book(self, loan_id: int, notes: Optional[str] = None) -> LoanResponse:
        """書籍を返却"""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError("指定された貸出記録が見つかりません")
        
        if loan.status != LoanStatus.ACTIVE:
            raise ValueError("この貸出は既に返却済みまたは無効です")
        
        # 返却処理
        loan.return_date = date.today()
        loan.status = LoanStatus.RETURNED
        if notes:
            loan.notes = f"{loan.notes or ''}\n返却時メモ: {notes}".strip()
        
        # 書籍のステータスを更新
        book = self.db.query(Book).filter(Book.id == loan.book_id).first()
        if book:
            # 予約処理を実行
            next_reservation = self._process_book_return_reservations(loan.book_id)
            
            if next_reservation:
                # 予約者がいる場合は、書籍を予約者用に準備
                book.status = "RESERVED"  # 予約者用に確保
                logger.info(f"書籍返却: 貸出ID{loan_id}, 次の予約者ID{next_reservation.user_id}に割り当て")
            else:
                # 予約者がいない場合は利用可能状態に
                book.status = "AVAILABLE"
                logger.info(f"書籍返却: 貸出ID{loan_id}, 利用可能状態に変更")
            
            book.available_copies = min(book.total_copies, book.available_copies + 1)
        
        self.db.commit()
        self.db.refresh(loan)
        
        return LoanResponse.model_validate(loan)
    
    def _process_book_return_reservations(self, book_id: int):
        """書籍返却時の予約処理（内部メソッド）"""
        from src.services.reservation_service import ReservationService
        
        # 予約サービスを使用して次の予約者を処理
        reservation_service = ReservationService(self.db)
        next_reservation = reservation_service.process_book_return(book_id)
        
        if next_reservation:
            # 通知処理（将来的にメール通知などを実装）
            self._notify_reservation_ready(next_reservation)
            logger.info(f"予約処理完了: 予約ID{next_reservation.id}, ユーザーID{next_reservation.user_id}")
        
        return next_reservation
    
    def _notify_reservation_ready(self, reservation):
        """予約準備完了通知（基本版）"""
        # 現在はログ出力のみ。将来的にメール通知やプッシュ通知を実装
        logger.info(f"通知: ユーザーID{reservation.user_id}の予約書籍（書籍ID{reservation.book_id}）が準備完了しました")
        
        # TODO: 以下の機能を将来実装
        # - メール通知
        # - システム内通知
        # - プッシュ通知
        # - SMS通知（オプション）
    
    def extend_loan(self, loan_id: int, extension_days: int = 7) -> LoanResponse:
        """貸出期間を延長"""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError("指定された貸出記録が見つかりません")
        
        if loan.status != LoanStatus.ACTIVE:
            raise ValueError("アクティブな貸出のみ延長できます")
        
        # 延長回数制限チェック
        max_renewals = 2
        if loan.renewal_count >= max_renewals:
            raise ValueError(f"延長上限回数（{max_renewals}回）に達しています")
        
        # 予約がある場合は延長不可
        from src.models.reservation import Reservation, ReservationStatus
        pending_reservations = self.db.query(Reservation).filter(
            and_(
                Reservation.book_id == loan.book_id,
                Reservation.status == ReservationStatus.PENDING
            )
        ).count()
        
        if pending_reservations > 0:
            raise ValueError("この書籍には予約が入っているため延長できません")
        
        # 延長処理
        loan.due_date = loan.due_date + timedelta(days=extension_days)
        loan.renewal_count += 1
        
        self.db.commit()
        self.db.refresh(loan)
        
        logger.info(f"貸出延長: 貸出ID{loan_id}, 延長日数{extension_days}日")
        return LoanResponse.model_validate(loan)
    
    def mark_as_lost(self, loan_id: int, notes: Optional[str] = None) -> LoanResponse:
        """書籍を紛失として処理"""
        loan = self.db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise ValueError("指定された貸出記録が見つかりません")
        
        if loan.status not in [LoanStatus.ACTIVE, LoanStatus.OVERDUE]:
            raise ValueError("アクティブまたは期限切れの貸出のみ紛失処理できます")
        
        # 紛失処理
        loan.status = LoanStatus.LOST
        if notes:
            loan.notes = f"{loan.notes or ''}\n紛失処理: {notes}".strip()
        
        # 書籍のステータスを更新（データベースの形式に合わせて文字列で保存）
        book = self.db.query(Book).filter(Book.id == loan.book_id).first()
        if book:
            book.status = "LOST"
        
        self.db.commit()
        self.db.refresh(loan)
        
        logger.info(f"書籍紛失処理: 貸出ID{loan_id}")
        return LoanResponse.model_validate(loan)
    
    def get_overdue_loans(self) -> List[LoanResponse]:
        """期限切れ貸出一覧を取得"""
        loans = self.db.query(Loan).filter(
            and_(
                Loan.status == LoanStatus.ACTIVE,
                Loan.due_date < date.today()
            )
        ).all()
        return [LoanResponse.model_validate(loan) for loan in loans]
    
    def get_loan_statistics(self) -> Dict[str, Any]:
        """貸出統計情報を取得"""
        total_loans = self.db.query(Loan).count()
        active_loans = self.db.query(Loan).filter(Loan.status == LoanStatus.ACTIVE).count()
        overdue_loans = self.db.query(Loan).filter(
            and_(
                Loan.status == LoanStatus.ACTIVE,
                Loan.due_date < date.today()
            )
        ).count()
        returned_loans = self.db.query(Loan).filter(Loan.status == LoanStatus.RETURNED).count()
        lost_loans = self.db.query(Loan).filter(Loan.status == LoanStatus.LOST).count()
        
        return {
            "total_loans": total_loans,
            "active_loans": active_loans,
            "overdue_loans": overdue_loans,
            "returned_loans": returned_loans,
            "lost_loans": lost_loans,
            "return_rate": round((returned_loans / total_loans * 100) if total_loans > 0 else 0, 2)
        }
    
    def update_overdue_loans(self) -> int:
        """延滞中の貸出を自動検出してステータスを更新"""
        try:
            # ACTIVEステータスで期限切れの貸出を取得
            overdue_loans = self.db.query(Loan).filter(
                and_(
                    Loan.status == LoanStatus.ACTIVE,
                    Loan.due_date < date.today()
                )
            ).all()
            
            updated_count = 0
            for loan in overdue_loans:
                # OVERDUEステータスに更新
                loan.status = LoanStatus.OVERDUE
                updated_count += 1
                logger.info(f"Loan {loan.id} marked as overdue (book_id: {loan.book_id}, user_id: {loan.user_id})")
            
            self.db.commit()
            return updated_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating overdue loans: {str(e)}")
            raise e
    
    def get_overdue_loans(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """延滞中の貸出を詳細情報付きで取得"""
        overdue_loans = self.db.query(Loan)\
            .join(Book, Loan.book_id == Book.id)\
            .join(User, Loan.user_id == User.id)\
            .filter(Loan.status == LoanStatus.OVERDUE)\
            .offset(skip).limit(limit).all()
        
        result = []
        for loan in overdue_loans:
            days_overdue = (date.today() - loan.due_date).days
            loan_data = {
                "id": loan.id,
                "user_id": loan.user_id,
                "book_id": loan.book_id,
                "loan_date": loan.loan_date,
                "due_date": loan.due_date,
                "status": loan.status,
                "days_overdue": days_overdue,
                "renewal_count": loan.renewal_count or 0,
                "notes": loan.notes,
                "book": {
                    "id": loan.book.id,
                    "title": loan.book.title,
                    "author": loan.book.author,
                    "isbn": loan.book.isbn,
                    "image_url": loan.book.image_url
                },
                "user": {
                    "id": loan.user.id,
                    "username": loan.user.username,
                    "full_name": loan.user.full_name,
                    "email": loan.user.email,
                    "department": loan.user.department
                }
            }
            result.append(loan_data)
        
        return result
    
    def get_books_with_loan_status(self, skip: int = 0, limit: int = 100, include_overdue_info: bool = True) -> List[Dict[str, Any]]:
        """貸出状況を含む書籍一覧を取得（延滞情報含む）"""
        from sqlalchemy.orm import joinedload
        
        books = self.db.query(Book)\
            .options(joinedload(Book.loans))\
            .offset(skip).limit(limit).all()
        
        result = []
        for book in books:
            # 現在のアクティブな貸出を確認
            active_loan = None
            overdue_loan = None
            
            for loan in book.loans:
                if loan.status == LoanStatus.ACTIVE:
                    active_loan = loan
                elif loan.status == LoanStatus.OVERDUE:
                    overdue_loan = loan
            
            # 書籍の詳細ステータスを決定
            detailed_status = {
                "basic_status": book.status.value if hasattr(book.status, 'value') else str(book.status),
                "is_borrowed": active_loan is not None or overdue_loan is not None,
                "is_overdue": overdue_loan is not None,
                "days_overdue": 0,
                "borrower_info": None
            }
            
            # 延滞情報がある場合
            if overdue_loan and include_overdue_info:
                detailed_status["days_overdue"] = (date.today() - overdue_loan.due_date).days
                detailed_status["borrower_info"] = {
                    "user_id": overdue_loan.user_id,
                    "username": overdue_loan.user.username if overdue_loan.user else None,
                    "full_name": overdue_loan.user.full_name if overdue_loan.user else None,
                    "due_date": overdue_loan.due_date,
                    "loan_id": overdue_loan.id
                }
            # アクティブな貸出情報がある場合
            elif active_loan and include_overdue_info:
                detailed_status["borrower_info"] = {
                    "user_id": active_loan.user_id,
                    "username": active_loan.user.username if active_loan.user else None,
                    "full_name": active_loan.user.full_name if active_loan.user else None,
                    "due_date": active_loan.due_date,
                    "loan_id": active_loan.id
                }
            
            book_data = {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "isbn": book.isbn,
                "publisher": book.publisher,
                "category": book.categories if hasattr(book, 'categories') else [],
                "category_structure": book.category_structure if hasattr(book, 'category_structure') else {},
                "location": book.location,
                "status": book.status.value if hasattr(book.status, 'value') else str(book.status),
                "total_copies": book.total_copies,
                "available_copies": book.available_copies,
                "image_url": book.image_url,
                "detailed_status": detailed_status,
                "created_at": book.created_at,
                "updated_at": book.updated_at
            }
            result.append(book_data)
        
        return result 