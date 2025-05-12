from typing import List, Dict, Optional, Any, TypeVar, Generic, Type
from datetime import datetime, timedelta
from app.data.dummy_data import users, books, loans, reservations, purchase_requests, counters
from app.models.models import User, Book, Loan, Reservation, PurchaseRequest, PurchaseRequestStatus

# インメモリデータストア
data_store = {
    "users": users,
    "books": books,
    "loans": loans,
    "reservations": reservations,
    "purchase_requests": purchase_requests,
    "counters": counters
}

T = TypeVar('T')

class DataStore(Generic[T]):
    def __init__(self, collection_name: str, model_class: Type[T]):
        self.collection_name = collection_name
        self.model_class = model_class
        self.counter_name = collection_name

    def get_all(self) -> List[T]:
        return data_store[self.collection_name]

    def get_by_id(self, id: int) -> Optional[T]:
        items = [item for item in data_store[self.collection_name] if item.id == id]
        return items[0] if items else None

    def create(self, item_data: Dict[str, Any]) -> T:
        # IDの自動採番
        item_id = data_store["counters"].get(self.counter_name, 1)
        data_store["counters"][self.counter_name] = item_id + 1
        
        # 新しいアイテムの作成
        item_data["id"] = item_id
        new_item = self.model_class(**item_data)
        
        # ストアに追加
        data_store[self.collection_name].append(new_item)
        return new_item

    def update(self, id: int, item_data: Dict[str, Any]) -> Optional[T]:
        # 更新対象のアイテムを検索
        for i, item in enumerate(data_store[self.collection_name]):
            if item.id == id:
                # 既存のアイテムを更新
                updated_data = item.model_dump()
                updated_data.update(item_data)
                updated_item = self.model_class(**updated_data)
                data_store[self.collection_name][i] = updated_item
                return updated_item
        return None

    def delete(self, id: int) -> bool:
        initial_length = len(data_store[self.collection_name])
        data_store[self.collection_name] = [
            item for item in data_store[self.collection_name] if item.id != id
        ]
        return len(data_store[self.collection_name]) < initial_length

    def filter(self, **kwargs) -> List[T]:
        result = []
        for item in data_store[self.collection_name]:
            match = True
            for key, value in kwargs.items():
                if not hasattr(item, key) or getattr(item, key) != value:
                    match = False
                    break
            if match:
                result.append(item)
        return result

# 各データストアのインスタンス作成
user_store = DataStore[User]("users", User)
book_store = DataStore[Book]("books", Book)
loan_store = DataStore[Loan]("loans", Loan)
reservation_store = DataStore[Reservation]("reservations", Reservation)
purchase_request_store = DataStore[PurchaseRequest]("purchase_requests", PurchaseRequest)

# 借りる、返却、予約などの特殊な操作のためのヘルパー関数
def borrow_book(book_id: int, user_id: int, days: int = 14) -> Optional[Loan]:
    """本を借りる関数"""
    book = book_store.get_by_id(book_id)
    if not book or not book.is_available:
        return None
    
    # 本の状態を更新
    book_store.update(book_id, {
        "is_available": False,
        "current_borrower_id": user_id
    })
    
    # 貸出記録を作成
    loan_data = {
        "book_id": book_id,
        "user_id": user_id,
        "borrowed_at": datetime.now(),
        "due_date": datetime.now() + timedelta(days=days),
        "is_returned": False
    }
    
    return loan_store.create(loan_data)

def return_book(loan_id: int) -> Optional[Loan]:
    """本を返却する関数"""
    loan = loan_store.get_by_id(loan_id)
    if not loan or loan.is_returned:
        return None
    
    # 貸出記録を更新
    updated_loan = loan_store.update(loan_id, {
        "is_returned": True,
        "returned_at": datetime.now()
    })
    
    # 予約があれば次の人に割り当て、なければ利用可能に
    reservations_for_book = reservation_store.filter(book_id=loan.book_id, is_active=True)
    if reservations_for_book:
        # 予約がある場合、予約順に並べ替え
        sorted_reservations = sorted(reservations_for_book, key=lambda r: r.position)
        next_reservation = sorted_reservations[0]
        
        # 本の状態を更新（次の予約者に割り当て）
        book_store.update(loan.book_id, {
            "is_available": False,
            "current_borrower_id": next_reservation.user_id
        })
        
        # 予約を非アクティブに
        reservation_store.update(next_reservation.id, {"is_active": False})
        
        # 残りの予約の順位を更新
        for r in sorted_reservations[1:]:
            reservation_store.update(r.id, {"position": r.position - 1})
    else:
        # 予約がない場合、単純に利用可能にする
        book_store.update(loan.book_id, {
            "is_available": True,
            "current_borrower_id": None
        })
    
    return updated_loan

def reserve_book(book_id: int, user_id: int) -> Optional[Reservation]:
    """本を予約する関数"""
    book = book_store.get_by_id(book_id)
    if not book:
        return None
    
    # 既に同じ本を予約している場合は予約できない
    existing_reservations = reservation_store.filter(book_id=book_id, user_id=user_id, is_active=True)
    if existing_reservations:
        return None
    
    # 既に借りている場合は予約できない
    if book.current_borrower_id == user_id:
        return None
    
    # 利用可能な場合は直接借りられるので予約不要
    if book.is_available:
        return None
    
    # 現在の予約数を取得して、次の順位を決定
    current_reservations = reservation_store.filter(book_id=book_id, is_active=True)
    position = len(current_reservations) + 1
    
    # 予約を作成
    reservation_data = {
        "book_id": book_id,
        "user_id": user_id,
        "reserved_at": datetime.now(),
        "position": position,
        "is_active": True
    }
    
    return reservation_store.create(reservation_data)

def cancel_reservation(reservation_id: int) -> bool:
    """予約をキャンセルする関数"""
    reservation = reservation_store.get_by_id(reservation_id)
    if not reservation or not reservation.is_active:
        return False
    
    # 予約を非アクティブに
    reservation_store.update(reservation_id, {"is_active": False})
    
    # 後続の予約の順位を更新
    subsequent_reservations = reservation_store.filter(book_id=reservation.book_id, is_active=True)
    for r in subsequent_reservations:
        if r.position > reservation.position:
            reservation_store.update(r.id, {"position": r.position - 1})
    
    return True

def create_purchase_request(user_id: int, amazon_url: str, title: str, author: str, reason: str, **kwargs) -> PurchaseRequest:
    """購入申請を作成する関数"""
    request_data = {
        "user_id": user_id,
        "amazon_url": amazon_url,
        "title": title,
        "author": author,
        "reason": reason,
        "created_at": datetime.now(),
        "status": PurchaseRequestStatus.PENDING,
        **kwargs
    }
    
    return purchase_request_store.create(request_data)

def process_purchase_request(request_id: int, approver_id: int, approve: bool) -> Optional[PurchaseRequest]:
    """購入申請を承認または却下する関数"""
    request = purchase_request_store.get_by_id(request_id)
    if not request or request.status != PurchaseRequestStatus.PENDING:
        return None
    
    status = PurchaseRequestStatus.APPROVED if approve else PurchaseRequestStatus.REJECTED
    
    return purchase_request_store.update(request_id, {
        "status": status,
        "approved_at": datetime.now(),
        "approver_id": approver_id
    })

def mark_request_as_purchased(request_id: int) -> Optional[PurchaseRequest]:
    """承認された申請を購入済みにする関数"""
    request = purchase_request_store.get_by_id(request_id)
    if not request or request.status != PurchaseRequestStatus.APPROVED:
        return None
    
    return purchase_request_store.update(request_id, {
        "status": PurchaseRequestStatus.PURCHASED,
        "purchase_date": datetime.now()
    }) 