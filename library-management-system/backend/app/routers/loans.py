from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.models import Loan
from app.data.store import loan_store, book_store, user_store, borrow_book, return_book
from pydantic import BaseModel

router = APIRouter()

class LoanCreate(BaseModel):
    book_id: int
    user_id: int
    days: Optional[int] = 14  # デフォルト貸出期間は14日

class LoanReturn(BaseModel):
    loan_id: int

@router.get("/", response_model=List[Loan])
async def get_loans(
    user_id: Optional[int] = None,
    book_id: Optional[int] = None,
    active_only: bool = False
):
    """
    貸出記録一覧を取得
    ユーザーIDまたは書籍IDで絞り込み可能
    active_only=Trueの場合、返却されていない貸出のみ取得
    """
    loans = loan_store.get_all()
    
    # 絞り込み条件の適用
    if user_id is not None:
        loans = [loan for loan in loans if loan.user_id == user_id]
    
    if book_id is not None:
        loans = [loan for loan in loans if loan.book_id == book_id]
    
    if active_only:
        loans = [loan for loan in loans if not loan.is_returned]
    
    return loans

@router.get("/{loan_id}", response_model=Loan)
async def get_loan(loan_id: int):
    """
    特定の貸出記録を取得
    """
    loan = loan_store.get_by_id(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="貸出記録が見つかりません")
    return loan

@router.post("/borrow", response_model=Loan)
async def create_loan(loan_data: LoanCreate):
    """
    書籍を借りる（新しい貸出記録を作成）
    """
    # ユーザーの存在確認
    user = user_store.get_by_id(loan_data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 書籍の存在と利用可能性の確認
    book = book_store.get_by_id(loan_data.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="書籍が見つかりません")
    
    if not book.is_available:
        raise HTTPException(status_code=400, detail="この書籍は現在貸出できません")
    
    # 既に同じ書籍を借りていないか確認
    active_loans = loan_store.filter(user_id=loan_data.user_id, book_id=loan_data.book_id, is_returned=False)
    if active_loans:
        raise HTTPException(status_code=400, detail="既にこの書籍を借りています")
    
    # 貸出期間の確認
    days = loan_data.days
    if days < 1 or days > 30:
        raise HTTPException(status_code=400, detail="貸出期間は1日から30日までの間で指定してください")
    
    # 本を借りる操作を実行
    new_loan = borrow_book(loan_data.book_id, loan_data.user_id, days)
    if not new_loan:
        raise HTTPException(status_code=500, detail="貸出処理に失敗しました")
    
    return new_loan

@router.post("/return")
async def return_loan(return_data: LoanReturn):
    """
    書籍を返却する
    """
    # 貸出記録の存在と状態の確認
    loan = loan_store.get_by_id(return_data.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="貸出記録が見つかりません")
    
    if loan.is_returned:
        raise HTTPException(status_code=400, detail="この書籍は既に返却されています")
    
    # 返却処理を実行
    updated_loan = return_book(return_data.loan_id)
    if not updated_loan:
        raise HTTPException(status_code=500, detail="返却処理に失敗しました")
    
    return {"message": "書籍を返却しました", "loan_id": return_data.loan_id}

@router.get("/user/{user_id}/active", response_model=List[Loan])
async def get_user_active_loans(user_id: int):
    """
    ユーザーの現在の貸出状況を取得
    """
    # ユーザーの存在確認
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # アクティブな貸出を取得
    active_loans = loan_store.filter(user_id=user_id, is_returned=False)
    
    return active_loans

@router.get("/overdue", response_model=List[Loan])
async def get_overdue_loans():
    """
    返却期限が過ぎた貸出を取得
    """
    all_loans = loan_store.get_all()
    now = datetime.now()
    
    # 返却期限が過ぎていて、まだ返却されていない貸出を抽出
    overdue_loans = [
        loan for loan in all_loans 
        if not loan.is_returned and loan.due_date < now
    ]
    
    return overdue_loans 