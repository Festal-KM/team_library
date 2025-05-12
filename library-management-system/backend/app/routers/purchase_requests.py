from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from app.models.models import PurchaseRequest, PurchaseRequestStatus, User, UserRole
from app.data.store import purchase_request_store, user_store, book_store, create_purchase_request, process_purchase_request, mark_request_as_purchased
from app.utils.amazon_scraper import scrape_amazon_book_info
from pydantic import BaseModel, HttpUrl

router = APIRouter()

class AmazonUrl(BaseModel):
    url: HttpUrl

class PurchaseRequestCreate(BaseModel):
    user_id: int
    amazon_url: str
    reason: str
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    price: Optional[float] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None

class PurchaseRequestProcess(BaseModel):
    request_id: int
    approver_id: int
    approve: bool
    comment: Optional[str] = None

class PurchaseRequestPurchased(BaseModel):
    request_id: int

@router.get("/", response_model=List[PurchaseRequest])
async def get_purchase_requests(
    user_id: Optional[int] = None,
    status: Optional[str] = None
):
    """購入申請一覧を取得"""
    requests = purchase_request_store.get_all()
    
    # 絞り込み条件の適用
    if user_id is not None:
        requests = [req for req in requests if req.user_id == user_id]
    
    if status:
        try:
            status_enum = PurchaseRequestStatus(status)
            requests = [req for req in requests if req.status == status_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"無効なステータス: {status}")
    
    return requests

@router.get("/{request_id}", response_model=PurchaseRequest)
async def get_purchase_request(request_id: int):
    """特定の購入申請を取得"""
    request = purchase_request_store.get_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="購入申請が見つかりません")
    return request

@router.post("/amazon/info")
async def get_amazon_book_info(amazon_data: AmazonUrl):
    """AmazonのURLから書籍情報を取得"""
    book_info = scrape_amazon_book_info(str(amazon_data.url))
    
    if not book_info.get("title") or not book_info.get("author"):
        raise HTTPException(status_code=400, detail="Amazonから有効な書籍情報を取得できませんでした")
    
    return book_info

@router.post("/", response_model=PurchaseRequest)
async def create_request(request_data: PurchaseRequestCreate):
    """新しい購入申請を作成"""
    # ユーザーの存在確認
    user = user_store.get_by_id(request_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 必須項目の確認
    if not request_data.title or not request_data.author:
        # Amazonから情報を取得
        book_info = scrape_amazon_book_info(request_data.amazon_url)
        
        if not book_info.get("title") or not book_info.get("author"):
            raise HTTPException(status_code=400, detail="有効な書籍情報を取得できませんでした。手動で入力してください。")
        
        # 取得した情報を適用
        for key, value in book_info.items():
            if value and not getattr(request_data, key, None):
                setattr(request_data, key, value)
    
    # ISBNが既に登録されているか確認
    if request_data.isbn:
        for book in book_store.get_all():
            if book.isbn == request_data.isbn:
                raise HTTPException(status_code=400, detail=f"ISBN {request_data.isbn} の書籍は既に蔵書にあります")
    
    # 購入申請を作成
    request_dict = request_data.model_dump(exclude={"user_id", "amazon_url", "reason"})
    new_request = create_purchase_request(
        user_id=request_data.user_id,
        amazon_url=request_data.amazon_url,
        title=request_data.title,
        author=request_data.author,
        reason=request_data.reason,
        **request_dict
    )
    
    return new_request

@router.post("/process")
async def process_request(process_data: PurchaseRequestProcess):
    """購入申請を承認または却下"""
    # リクエストの存在確認
    request = purchase_request_store.get_by_id(process_data.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="購入申請が見つかりません")
    
    # 承認者の存在と権限の確認
    approver = user_store.get_by_id(process_data.approver_id)
    if not approver:
        raise HTTPException(status_code=404, detail="承認者が見つかりません")
    
    if approver.role not in [UserRole.APPROVER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="この操作には承認者または管理者の権限が必要です")
    
    # 既に処理済みのリクエストは再処理不可
    if request.status != PurchaseRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"この申請は既に処理されています: {request.status}")
    
    # 承認または却下の処理
    updated_request = process_purchase_request(
        process_data.request_id,
        process_data.approver_id,
        process_data.approve
    )
    
    if not updated_request:
        raise HTTPException(status_code=500, detail="申請の処理に失敗しました")
    
    result = "承認" if process_data.approve else "却下"
    return {"message": f"購入申請を{result}しました", "status": updated_request.status}

@router.post("/purchased")
async def mark_as_purchased(purchase_data: PurchaseRequestPurchased):
    """購入申請を購入済みに設定"""
    # リクエストの存在確認
    request = purchase_request_store.get_by_id(purchase_data.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="購入申請が見つかりません")
    
    # 承認済みのリクエストのみ購入済みに設定可能
    if request.status != PurchaseRequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail="承認済みの申請のみ購入済みに設定できます")
    
    # 購入済みに更新
    updated_request = mark_request_as_purchased(purchase_data.request_id)
    
    if not updated_request:
        raise HTTPException(status_code=500, detail="購入済み設定に失敗しました")
    
    return {"message": "購入申請を購入済みに設定しました", "status": updated_request.status}

@router.get("/pending", response_model=List[PurchaseRequest])
async def get_pending_requests():
    """承認待ちの購入申請一覧を取得"""
    pending_requests = purchase_request_store.filter(status=PurchaseRequestStatus.PENDING)
    return pending_requests

@router.get("/user/{user_id}", response_model=List[PurchaseRequest])
async def get_user_requests(user_id: int):
    """特定のユーザーの購入申請履歴を取得"""
    # ユーザーの存在確認
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    user_requests = purchase_request_store.filter(user_id=user_id)
    return user_requests 