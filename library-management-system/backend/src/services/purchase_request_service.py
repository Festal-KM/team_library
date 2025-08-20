"""
購入申請サービス - ビジネスロジック層
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import logging
import re
from urllib.parse import unquote

from src.models.purchase_request import PurchaseRequest, PurchaseRequestStatus
from src.models.user import User
from src.schemas.purchase_request import PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestResponse

logger = logging.getLogger(__name__)


class PurchaseRequestService:
    """購入申請サービスクラス"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_purchase_requests(
        self, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[PurchaseRequestStatus] = None,
        user_id: Optional[int] = None,
        priority: Optional[int] = None,
        pending_only: bool = False
    ) -> List[PurchaseRequestResponse]:
        """購入申請一覧を取得"""
        query = self.db.query(PurchaseRequest).join(User)
        
        # フィルタリング
        if status:
            query = query.filter(PurchaseRequest.status == status)
        
        if user_id:
            query = query.filter(PurchaseRequest.user_id == user_id)
        
        if priority:
            query = query.filter(PurchaseRequest.priority == priority)
        
        if pending_only:
            query = query.filter(PurchaseRequest.status == PurchaseRequestStatus.PENDING)
        
        # 優先度、作成日順でソート
        requests = query.order_by(
            PurchaseRequest.priority, 
            PurchaseRequest.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        # ユーザー情報を含めてレスポンスを作成
        result = []
        for request in requests:
            # PurchaseRequestResponseに変換
            response_data = PurchaseRequestResponse.model_validate(request)
            response_dict = response_data.model_dump()
            
            # ユーザー情報を追加
            response_dict['user'] = {
                'id': request.user.id,
                'full_name': request.user.full_name or request.user.username,
                'email': request.user.email
            }
            
            # admin_notesからAmazon URLを抽出
            if request.admin_notes and "Amazon URL:" in request.admin_notes:
                import re
                url_match = re.search(r'Amazon URL: (https?://[^\s]+)', request.admin_notes)
                if url_match:
                    response_dict['amazon_url'] = url_match.group(1)
            
            result.append(response_dict)
        
        return result
    
    def get_purchase_request_by_id(self, request_id: int) -> Optional[PurchaseRequestResponse]:
        """IDで購入申請を取得"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if request:
            # PurchaseRequestResponseに変換
            response_data = PurchaseRequestResponse.model_validate(request)
            
            # admin_notesからAmazon URLを抽出
            if request.admin_notes and "Amazon URL:" in request.admin_notes:
                import re
                url_match = re.search(r'Amazon URL: (https?://[^\s]+)', request.admin_notes)
                if url_match:
                    # amazon_urlフィールドを設定
                    response_dict = response_data.model_dump()
                    response_dict['amazon_url'] = url_match.group(1)
                    return PurchaseRequestResponse(**response_dict)
            
            return response_data
        return None
    
    def get_user_purchase_requests(self, user_id: int, active_only: bool = False) -> List[PurchaseRequestResponse]:
        """ユーザーの購入申請を取得"""
        query = self.db.query(PurchaseRequest).filter(PurchaseRequest.user_id == user_id)
        
        if active_only:
            query = query.filter(
                PurchaseRequest.status.in_([
                    PurchaseRequestStatus.PENDING,
                    PurchaseRequestStatus.APPROVED,
                    PurchaseRequestStatus.ORDERED
                ])
            )
        
        requests = query.order_by(PurchaseRequest.created_at.desc()).all()
        
        # Amazon URLを抽出してレスポンスに含める
        result = []
        for request in requests:
            request_dict = PurchaseRequestResponse.model_validate(request).model_dump()
            
            # admin_notesからAmazon URLを抽出
            if request.admin_notes and "Amazon URL:" in request.admin_notes:
                import re
                url_match = re.search(r'Amazon URL: (https?://[^\s]+)', request.admin_notes)
                if url_match:
                    request_dict['amazon_url'] = url_match.group(1)
            
            result.append(request_dict)
        
        return result
    
    def get_pending_requests(self) -> List[PurchaseRequestResponse]:
        """承認待ちの購入申請を取得"""
        requests = self.db.query(PurchaseRequest).join(User).filter(
            PurchaseRequest.status == PurchaseRequestStatus.PENDING
        ).order_by(PurchaseRequest.priority, PurchaseRequest.created_at).all()
        
        # ユーザー情報を含めてレスポンスを作成
        result = []
        for request in requests:
            request_dict = PurchaseRequestResponse.model_validate(request).model_dump()
            request_dict['user'] = {
                'id': request.user.id,
                'full_name': request.user.full_name or request.user.username,
                'email': request.user.email
            }
            
            # admin_notesからAmazon URLを抽出
            if request.admin_notes and "Amazon URL:" in request.admin_notes:
                import re
                url_match = re.search(r'Amazon URL: (https?://[^\s]+)', request.admin_notes)
                if url_match:
                    request_dict['amazon_url'] = url_match.group(1)
            
            result.append(request_dict)
        
        return result
    
    def create_purchase_request(self, request_data: PurchaseRequestCreate) -> PurchaseRequestResponse:
        """新しい購入申請を作成"""
        # ユーザーの存在確認
        user = self.db.query(User).filter(User.id == request_data.user_id).first()
        if not user:
            raise ValueError("指定されたユーザーが見つかりません")
        
        # 同じ書籍の重複申請チェック
        existing_request = self.db.query(PurchaseRequest).filter(
            and_(
                PurchaseRequest.user_id == request_data.user_id,
                PurchaseRequest.title == request_data.title,
                PurchaseRequest.author == request_data.author,
                PurchaseRequest.status.in_([
                    PurchaseRequestStatus.PENDING,
                    PurchaseRequestStatus.APPROVED,
                    PurchaseRequestStatus.ORDERED
                ])
            )
        ).first()
        
        if existing_request:
            raise ValueError("同じ書籍の申請が既に存在します")
        
        # ユーザーの申請制限チェック
        active_requests_count = self.db.query(PurchaseRequest).filter(
            and_(
                PurchaseRequest.user_id == request_data.user_id,
                PurchaseRequest.status.in_([
                    PurchaseRequestStatus.PENDING,
                    PurchaseRequestStatus.APPROVED,
                    PurchaseRequestStatus.ORDERED
                ])
            )
        ).count()
        
        max_requests = 5  # 最大申請数
        if active_requests_count >= max_requests:
            raise ValueError(f"申請上限（{max_requests}件）に達しています")
        
        # Amazon URLをadmin_notesに保存（一時的な対応）
        admin_notes = None
        if hasattr(request_data, 'amazon_url') and request_data.amazon_url:
            admin_notes = f"Amazon URL: {request_data.amazon_url}"
        
        # 購入申請レコードを作成
        purchase_request = PurchaseRequest(
            user_id=request_data.user_id,
            title=request_data.title,
            author=request_data.author,
            isbn=request_data.isbn,
            publisher=request_data.publisher,
            estimated_price=request_data.estimated_price,
            reason=request_data.reason,
            priority=request_data.priority or 3,
            image_url=request_data.image_url,
            admin_notes=admin_notes,
            status=PurchaseRequestStatus.PENDING
        )
        
        self.db.add(purchase_request)
        self.db.commit()
        self.db.refresh(purchase_request)
        
        logger.info(f"新規購入申請作成: ユーザー{request_data.user_id}, 書籍'{request_data.title}'")
        return PurchaseRequestResponse.model_validate(purchase_request)
    
    def update_purchase_request(
        self, 
        request_id: int, 
        update_data: PurchaseRequestUpdate,
        user_id: Optional[int] = None
    ) -> PurchaseRequestResponse:
        """購入申請を更新"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")
        
        # ユーザーIDが指定されている場合は権限チェック
        if user_id and request.user_id != user_id:
            raise ValueError("この購入申請を更新する権限がありません")
        
        # 承認済み以降は申請者による更新不可
        if (user_id and request.status != PurchaseRequestStatus.PENDING):
            raise ValueError("承認済みの申請は更新できません")
        
        # 更新可能なフィールドのみ更新
        update_fields = update_data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            if hasattr(request, field):
                setattr(request, field, value)
        
        self.db.commit()
        self.db.refresh(request)
        
        logger.info(f"購入申請更新: 申請ID{request_id}")
        return PurchaseRequestResponse.model_validate(request)
    
    def approve_request(self, request_id: int, admin_notes: Optional[str] = None) -> PurchaseRequestResponse:
        """購入申請を承認"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")

        if request.status != PurchaseRequestStatus.PENDING:
            raise ValueError("承認待ち状態の申請のみ承認できます")

        # 申請ステータスを承認済みに更新
        request.status = PurchaseRequestStatus.APPROVED
        request.approved_at = datetime.utcnow()
        if admin_notes:
            request.admin_notes = admin_notes

        # 書籍を図書館システムに登録（承認済みの場合）
        try:
            from src.services.book_service import BookService
            from src.schemas.book import BookCreate, CategoryStructure
            
            book_service = BookService(self.db)
            
            # 階層カテゴリ構造の設定（技術書としてデフォルト設定）
            category_structure = CategoryStructure(
                major_category="技術書",
                minor_categories=["その他技術"]  # 有効な中項目を使用
            )
            
            book_data = BookCreate(
                title=request.title,
                author=request.author,
                isbn=request.isbn,
                publisher=request.publisher,
                publication_date=None,  # 出版日は後で設定
                description=request.reason,  # 申請理由を説明として使用
                location="",  # 書架位置はブランク
                price=request.estimated_price,
                category_structure=category_structure,
                image_url=request.image_url
            )
            
            created_book = book_service.create_book(book_data)
            
            logger.info(f"書籍登録完了: {created_book.title} (ID: {created_book.id}) - 申請ID: {request_id}")
            
        except Exception as e:
            logger.error(f"書籍登録エラー (申請ID: {request_id}): {e}")
            # 書籍登録に失敗してもエラーにしない（手動で後で登録可能）

        self.db.commit()
        self.db.refresh(request)

        logger.info(f"購入申請承認: ID={request_id}, 申請者={request.user.full_name if request.user else 'Unknown'}")
        return PurchaseRequestResponse.model_validate(request)
    
    def reject_request(self, request_id: int, admin_notes: str) -> PurchaseRequestResponse:
        """購入申請を却下"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")
        
        if request.status != PurchaseRequestStatus.PENDING:
            raise ValueError("承認待ち状態の申請のみ却下できます")
        
        # 却下処理
        request.status = PurchaseRequestStatus.REJECTED
        request.admin_notes = admin_notes
        
        self.db.commit()
        self.db.refresh(request)
        
        logger.info(f"購入申請却下: 申請ID{request_id}")
        return PurchaseRequestResponse.model_validate(request)
    
    def mark_as_ordered(self, request_id: int, admin_notes: Optional[str] = None) -> PurchaseRequestResponse:
        """購入申請を発注済みに設定"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")
        
        if request.status != PurchaseRequestStatus.APPROVED:
            raise ValueError("承認済みの申請のみ発注済みに設定できます")
        
        # 発注済み処理
        request.status = PurchaseRequestStatus.ORDERED
        if admin_notes:
            request.admin_notes = f"{request.admin_notes or ''}\n発注メモ: {admin_notes}".strip()
        
        self.db.commit()
        self.db.refresh(request)
        
        logger.info(f"購入申請発注済み: 申請ID{request_id}")
        return PurchaseRequestResponse.model_validate(request)
    
    def mark_as_received(self, request_id: int, admin_notes: Optional[str] = None) -> PurchaseRequestResponse:
        """購入申請を受領済みにして図書館に追加（完了状態に設定）"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")
        
        if request.status != PurchaseRequestStatus.ORDERED:
            raise ValueError("発注済みの申請のみ受領済みに設定できます")
        
        try:
            # 書籍を図書館に追加
            from src.services.book_service import BookService
            from src.schemas.book import BookCreate, CategoryStructure
            
            # デバッグ情報をログ出力
            logger.info(f"受領処理開始: 申請ID{request_id}, ISBN='{request.isbn}', タイトル='{request.title}'")
            
            book_service = BookService(self.db)
            
            # 階層カテゴリ構造の設定
            category_structure = CategoryStructure(
                major_category="技術書",
                minor_categories=["その他技術"]  # 有効な中項目を使用
            )
            
            book_create_data = BookCreate(
                title=request.title,
                author=request.author or "",
                publisher=request.publisher or "",
                isbn=request.isbn or "",
                description=f"購入申請ID: {request_id} から追加",
                location="",  # 書架位置はブランクに設定
                image_url=request.image_url,
                price=request.estimated_price,
                category_structure=category_structure,
                categories=["技術書"]  # 後方互換性のため
            )
            
            # 書籍を図書館に追加
            book = book_service.create_book(book_create_data)
            
            # 受領済み処理（完了状態に設定）
            request.status = PurchaseRequestStatus.COMPLETED
            if admin_notes:
                request.admin_notes = f"{request.admin_notes or ''}\n受領・図書館追加メモ: {admin_notes}\n図書館に追加されました (書籍ID: {book.id})".strip()
            else:
                request.admin_notes = f"{request.admin_notes or ''}\n受領完了・図書館に追加されました (書籍ID: {book.id})".strip()
            
            self.db.commit()
            self.db.refresh(request)
            
            logger.info(f"購入申請受領済み・図書館追加完了: 申請ID{request_id}, 書籍ID{book.id}")
            return PurchaseRequestResponse.model_validate(request)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"図書館追加処理エラー: 申請ID{request_id}, エラー: {str(e)}")
            raise ValueError(f"図書館への書籍追加に失敗しました: {str(e)}")
    
    def cancel_request(self, request_id: int, user_id: Optional[int] = None) -> PurchaseRequestResponse:
        """購入申請をキャンセル"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")
        
        # ユーザーIDが指定されている場合は権限チェック
        if user_id and request.user_id != user_id:
            raise ValueError("この購入申請をキャンセルする権限がありません")
        
        if request.status not in [PurchaseRequestStatus.PENDING, PurchaseRequestStatus.APPROVED]:
            raise ValueError("承認待ちまたは承認済みの申請のみキャンセルできます")
        
        # キャンセル処理
        request.status = PurchaseRequestStatus.CANCELLED
        
        self.db.commit()
        self.db.refresh(request)
        
        logger.info(f"購入申請キャンセル: 申請ID{request_id}")
        return PurchaseRequestResponse.model_validate(request)
    
    def get_amazon_book_info(self, amazon_url: str) -> Dict[str, Any]:
        """Amazon書籍情報を実際にスクレイピングして取得"""
        try:
            # 実際のスクレイピング処理を使用
            from src.services.amazon_scraper import amazon_scraper
            
            logger.info(f"Amazon書籍情報を取得中: {amazon_url}")
            result = amazon_scraper.scrape_amazon_book_info(amazon_url)
            
            if result.get("success"):
                logger.info(f"Amazon書籍情報取得成功: {result['book_info']['title']}")
                return result
            else:
                logger.warning(f"Amazon書籍情報取得失敗: {result.get('error', '不明なエラー')}")
                return result
        
        except Exception as e:
            logger.error(f"Amazon書籍情報取得エラー: {str(e)}")
            return {
                "success": False,
                "error": "書籍情報の取得に失敗しました",
                "detail": str(e)
            }
    
    def get_purchase_request_statistics(self) -> Dict[str, Any]:
        """購入申請統計情報を取得"""
        total_requests = self.db.query(PurchaseRequest).count()
        pending_requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.status == PurchaseRequestStatus.PENDING
        ).count()
        approved_requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.status == PurchaseRequestStatus.APPROVED
        ).count()
        rejected_requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.status == PurchaseRequestStatus.REJECTED
        ).count()
        ordered_requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.status == PurchaseRequestStatus.ORDERED
        ).count()
        received_requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.status == PurchaseRequestStatus.RECEIVED
        ).count()
        cancelled_requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.status == PurchaseRequestStatus.CANCELLED
        ).count()
        
        # 総予算計算（承認済み以降の申請）
        total_budget = self.db.query(func.sum(PurchaseRequest.estimated_price)).filter(
            PurchaseRequest.status.in_([
                PurchaseRequestStatus.APPROVED,
                PurchaseRequestStatus.ORDERED,
                PurchaseRequestStatus.RECEIVED
            ])
        ).scalar() or 0
        
        return {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "approved_requests": approved_requests,
            "rejected_requests": rejected_requests,
            "ordered_requests": ordered_requests,
            "received_requests": received_requests,
            "cancelled_requests": cancelled_requests,
            "approval_rate": round((approved_requests / total_requests * 100) if total_requests > 0 else 0, 2),
            "total_budget": float(total_budget)
        }
    
    def mark_as_library_added(self, request_id: int, admin_notes: Optional[str] = None) -> PurchaseRequestResponse:
        """購入申請を図書館追加済みに設定"""
        request = self.db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise ValueError("指定された購入申請が見つかりません")
        
        if request.status != PurchaseRequestStatus.RECEIVED:
            raise ValueError("受領済みの申請のみ図書館に追加できます")
        
        # 図書館追加済み処理
        request.status = PurchaseRequestStatus.COMPLETED
        if admin_notes:
            request.admin_notes = f"{request.admin_notes or ''}\n図書館追加メモ: {admin_notes}".strip()
        
        self.db.commit()
        self.db.refresh(request)
        
        logger.info(f"購入申請図書館追加済み: 申請ID{request_id}")
        return PurchaseRequestResponse.model_validate(request) 