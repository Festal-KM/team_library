"""
購入申請関連API
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from src.models.base import get_db
from src.services.purchase_request_service import PurchaseRequestService
from src.schemas.purchase_request import (
    PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestApproval,
    PurchaseRequestRejection, PurchaseRequestStatusUpdate, AmazonBookInfoRequest,
    PurchaseRequestResponse, PurchaseRequestListResponse, PurchaseRequestStatistics,
    AmazonBookInfoResponse, PurchaseRequestCreateResponse, PurchaseRequestUpdateResponse,
    PurchaseRequestApprovalResponse, PurchaseRequestRejectionResponse, PurchaseRequestStatusResponse
)
from src.models.purchase_request import PurchaseRequestStatus
from src.utils.dependencies import get_current_user, require_admin, require_approver_or_admin
from src.models.user import User

router = APIRouter()


# 特定のパスを先に定義（/{request_id}より前に）
@router.get("/amazon-info", summary="Amazon書籍情報取得", response_model=AmazonBookInfoResponse)
def get_amazon_book_info(
    amazon_url: str = Query(..., description="AmazonのURL"),
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_current_user)  # 一時的に無効化
):
    """AmazonのURLから書籍情報を取得"""
    try:
        service = PurchaseRequestService(db)
        result = service.get_amazon_book_info(amazon_url)
        
        return AmazonBookInfoResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", summary="承認待ち購入申請取得")
def get_pending_purchase_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """承認待ちの購入申請を取得（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        requests = service.get_pending_requests()
        
        return {"requests": requests}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics", summary="購入申請統計取得", response_model=PurchaseRequestStatistics)
def get_purchase_request_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """購入申請統計情報を取得（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        stats = service.get_purchase_request_statistics()
        
        return PurchaseRequestStatistics(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}", summary="ユーザーの購入申請一覧取得")
def get_user_purchase_requests(
    user_id: int,
    active_only: bool = Query(False, description="アクティブな申請のみ"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """指定ユーザーの購入申請一覧を取得"""
    try:
        # 自分の申請または管理者・承認者のみアクセス可能
        from src.models.user import UserRole
        if (user_id != current_user.id and 
            current_user.role not in [UserRole.ADMIN, UserRole.APPROVER]):
            raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        service = PurchaseRequestService(db)
        requests = service.get_user_purchase_requests(user_id, active_only)
        
        return {"requests": requests}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", summary="購入申請一覧取得", response_model=PurchaseRequestListResponse)
def get_purchase_requests(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    status: Optional[PurchaseRequestStatus] = Query(None, description="申請ステータス"),
    user_id: Optional[int] = Query(None, description="ユーザーID"),
    priority: Optional[int] = Query(None, ge=1, le=3, description="優先度"),
    pending_only: bool = Query(False, description="承認待ちのみ"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """購入申請一覧を取得（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        skip = (page - 1) * per_page
        
        requests = service.get_purchase_requests(
            skip=skip,
            limit=per_page,
            status=status,
            user_id=user_id,
            priority=priority,
            pending_only=pending_only
        )
        
        # 総件数を取得（簡易実装）
        total = len(service.get_purchase_requests(skip=0, limit=1000))
        pages = math.ceil(total / per_page)
        
        return PurchaseRequestListResponse(
            requests=requests,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{request_id}", summary="購入申請詳細取得", response_model=PurchaseRequestResponse)
def get_purchase_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """購入申請詳細を取得"""
    try:
        service = PurchaseRequestService(db)
        request = service.get_purchase_request_by_id(request_id)
        
        if not request:
            raise HTTPException(status_code=404, detail="購入申請が見つかりません")
        
        # 自分の申請または図書館員・管理者のみアクセス可能
        from src.models.user import UserRole
        if (request.user_id != current_user.id and 
            current_user.role not in [UserRole.ADMIN, UserRole.APPROVER]):
            raise HTTPException(status_code=403, detail="アクセス権限がありません")
        
        return request
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@router.post("/", summary="新規購入申請作成", response_model=PurchaseRequestCreateResponse)
def create_purchase_request(
    request_data: PurchaseRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """新規購入申請を作成"""
    try:
        # 自分の申請または管理者・承認者のみ作成可能
        from src.models.user import UserRole
        if (request_data.user_id != current_user.id and 
            current_user.role not in [UserRole.ADMIN, UserRole.APPROVER]):
            raise HTTPException(status_code=403, detail="この申請を作成する権限がありません")
        
        service = PurchaseRequestService(db)
        request = service.create_purchase_request(request_data)
        
        return PurchaseRequestCreateResponse(
            message="購入申請が正常に作成されました",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{request_id}", summary="購入申請更新", response_model=PurchaseRequestUpdateResponse)
def update_purchase_request(
    request_id: int,
    update_data: PurchaseRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """購入申請を更新"""
    try:
        service = PurchaseRequestService(db)
        
        # 権限チェック（自分の申請または図書館員・管理者）
        user_id = current_user.id if current_user.role.value not in ["admin", "librarian"] else None
        
        request = service.update_purchase_request(request_id, update_data, user_id)
        
        return PurchaseRequestUpdateResponse(
            message="購入申請が正常に更新されました",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/approve", summary="購入申請承認", response_model=PurchaseRequestApprovalResponse)
def approve_purchase_request(
    request_id: int,
    approval_data: PurchaseRequestApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """購入申請を承認（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        request = service.approve_request(request_id, approval_data.admin_notes)
        
        return PurchaseRequestApprovalResponse(
            message="購入申請が正常に承認されました",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/reject", summary="購入申請却下", response_model=PurchaseRequestRejectionResponse)
def reject_purchase_request(
    request_id: int,
    rejection_data: PurchaseRequestRejection,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """購入申請を却下（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        request = service.reject_request(request_id, rejection_data.admin_notes)
        
        return PurchaseRequestRejectionResponse(
            message="購入申請が正常に却下されました",
            request=request
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/mark-ordered", summary="購入申請を発注済みに設定")
def mark_as_ordered(
    request_id: int,
    request_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """購入申請を発注済みに設定（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        admin_notes = request_data.get("admin_notes", "発注済みにしました")
        
        result = service.mark_as_ordered(request_id, admin_notes)
        return {
            "message": "購入申請を発注済みに設定しました",
            "status": "ordered",
            "request": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/mark-received", summary="購入申請を受領済みに設定")
def mark_as_received(
    request_id: int,
    request_data: dict = Body({}),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """購入申請を受領済みに設定（図書館員・管理者のみ）"""
    try:
        service = PurchaseRequestService(db)
        admin_notes = request_data.get("admin_notes", "受領完了・図書館追加済み")
        
        result = service.mark_as_received(request_id, admin_notes)
        return {
            "message": "購入申請を受領完了し、図書館に追加しました",
            "status": "completed",
            "request": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/cancel", summary="購入申請キャンセル")
def cancel_purchase_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """購入申請をキャンセル"""
    try:
        service = PurchaseRequestService(db)
        
        # 権限チェック（自分の申請または図書館員・管理者）
        user_id = current_user.id if current_user.role.value not in ["admin", "librarian"] else None
        
        request = service.cancel_request(request_id, user_id)
        
        return {
            "message": "購入申請が正常にキャンセルされました",
            "request": request
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{request_id}/add-to-library", summary="受領済み申請から図書館に追加")
def add_book_from_request(
    request_id: int,
    book_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approver_or_admin)
):
    """受領済み購入申請から書籍を図書館に追加（図書館員・管理者のみ）"""
    try:
        from src.models.purchase_request import PurchaseRequest
        
        # 購入申請の詳細を直接データベースから取得
        request = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
        if not request:
            raise HTTPException(status_code=404, detail="購入申請が見つかりません")
        
        if request.status.value != "received":
            raise HTTPException(status_code=400, detail="受領済みの申請のみ図書館に追加できます")
        
        # 書籍データを作成
        from src.services.book_service import BookService
        book_service = BookService(db)
        
        book_create_data = {
            "title": request.title,
            "author": request.author or "",
            "publisher": request.publisher or "",
            "isbn": request.isbn or "",
            "categories": book_data.get("categories", ["その他"]),  # 複数カテゴリ対応
            "location": "",  # 書架位置はブランクに設定
            "description": f"購入申請ID: {request_id} から追加",
            "image_url": request.image_url or "/images/book-placeholder.svg",
            "tags": book_data.get("tags", ["購入申請"]),
            "is_available": True
        }
        
        # 書籍を図書館に追加
        book = book_service.create_book(book_create_data)
        
        # 購入申請のステータスを更新（図書館追加済み）
        service = PurchaseRequestService(db)
        service.mark_as_library_added(request_id, f"図書館に追加されました (書籍ID: {book.id})")
        
        return {
            "message": "書籍が正常に図書館に追加されました",
            "book": book,
            "request_id": request_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


