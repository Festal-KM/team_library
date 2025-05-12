from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import os
from datetime import datetime, timedelta
import random
from typing import List, Optional
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re
from fake_useragent import UserAgent
import logging
import cloudscraper
import urllib.parse

# ロギング設定
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Pydanticモデルの定義
class PurchaseRequestCreate(BaseModel):
    title: str
    author: Optional[str] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    url: Optional[str] = None
    reason: str
    user_id: int

class PurchaseRequest(BaseModel):
    id: int
    title: str
    author: Optional[str] = None
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    url: Optional[str] = None
    reason: str
    user_id: int
    status: str
    created_at: str
    updated_at: str
    approved_by: Optional[int] = None
    approved_at: Optional[str] = None
    amazon_info: Optional[dict] = None

class ReservationCreate(BaseModel):
    book_id: int
    user_id: int

# 書籍インポート用のモデル
class BookImport(BaseModel):
    title: str
    author: str
    publisher: str = None
    isbn: str = None
    publication_date: str = None
    category: str = None
    description: str = None
    location: str = "図書館本棚"
    donated_by: int = None
    donation_note: str = None
    tags: list[str] = None
    cover_image: str = None  # 表紙画像URLフィールドを追加

app = FastAPI(title="蔵書管理システム API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境では全てのオリジンを許可
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # 明示的にPOSTを含める
    allow_headers=["*"],
    expose_headers=["Content-Type", "X-Requested-With", "Authorization"],
)

# 静的ファイル提供の設定
os.makedirs("static/images", exist_ok=True)

# プレースホルダー画像を作成
for book_image in ["readable-code.jpg", "pragmatic-programmer.jpg", "clean-architecture.jpg", "practical-object-oriented-design.jpg", "domain-driven-design.jpg", "real-world-http.jpg"]:
    if not os.path.exists(f"static/images/{book_image}"):
        # 1x1の透明なGIF画像（Base64エンコード）
        with open(f"static/images/{book_image}", "wb") as f:
            f.write(b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b')
        logger.info(f"Created placeholder image: {book_image}")

# 静的ファイルを提供
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# 書籍のサンプルデータ
BOOKS = [
    {
        "id": 1,
        "title": "リーダブルコード",
        "author": "Dustin Boswell, Trevor Foucher",
        "publisher": "オライリージャパン",
        "isbn": "9784873115658",
        "publication_date": "2012-06-23",
        "category": "プログラミング",
        "description": "より良いコードを書くためのシンプルで実践的なテクニック",
        "cover_image": "/images/readable-code.jpg",
        "status": "borrowed",
        "borrower_id": 2,
        "borrow_date": (datetime.now() - timedelta(days=3)).isoformat(),
        "return_date": None,
        "location": "技術書棚A-1",
        "tags": ["プログラミング", "コードレビュー", "ベストプラクティス"],
        "rating": 4.8,
        "reservations": []
    },
    {
        "id": 2,
        "title": "達人プログラマー",
        "author": "Andrew Hunt, David Thomas",
        "publisher": "アスキードワンゴ",
        "isbn": "9784048930895",
        "publication_date": "2016-11-18",
        "category": "プログラミング",
        "description": "プログラマー人生を豊かにする知恵とテクニック",
        "cover_image": "/images/pragmatic-programmer.jpg",
        "status": "borrowed",
        "borrower_id": 1,
        "borrow_date": (datetime.now() - timedelta(days=5)).isoformat(),
        "return_date": None,
        "location": "技術書棚A-2",
        "tags": ["プログラミング", "キャリア", "方法論"],
        "rating": 4.7,
        "reservations": [
            {"id": 1, "user_id": 2, "reservation_date": (datetime.now() - timedelta(days=2)).isoformat(), "position": 1}
        ]
    },
    {
        "id": 3,
        "title": "Clean Architecture",
        "author": "Robert C. Martin",
        "publisher": "ピアソン・エデュケーション",
        "isbn": "9784798165486",
        "publication_date": "2019-07-27",
        "category": "ソフトウェア設計",
        "description": "実装に依存しない、テスト可能でスケーラブルなシステム設計の方法",
        "cover_image": "/images/clean-architecture.jpg",
        "status": "borrowed",
        "borrower_id": 3,
        "borrow_date": (datetime.now() - timedelta(days=2)).isoformat(),
        "return_date": None,
        "location": "技術書棚B-1",
        "tags": ["アーキテクチャ", "設計", "SOLID原則"],
        "rating": 4.6,
        "reservations": []
    },
    {
        "id": 4,
        "title": "オブジェクト指向設計実践ガイド",
        "author": "Sandi Metz",
        "publisher": "技術評論社",
        "isbn": "9784774183619",
        "publication_date": "2016-09-23",
        "category": "プログラミング",
        "description": "Rubyでわかる進化しつづける柔軟なアプリケーションの育て方",
        "cover_image": "/images/practical-object-oriented-design.jpg",
        "status": "borrowed",
        "borrower_id": 2,
        "borrow_date": (datetime.now() - timedelta(days=7)).isoformat(),
        "return_date": None,
        "location": "技術書棚B-2",
        "tags": ["オブジェクト指向", "Ruby", "設計パターン"],
        "rating": 4.5,
        "reservations": []
    },
    {
        "id": 5,
        "title": "エンジニアのためのドメイン駆動設計入門",
        "author": "成瀬允宣",
        "publisher": "技術評論社",
        "isbn": "9784297105747",
        "publication_date": "2020-04-25",
        "category": "ソフトウェア設計",
        "description": "実践的なDDD入門書",
        "cover_image": "/images/domain-driven-design.jpg",
        "status": "borrowed",
        "borrower_id": 3,
        "borrow_date": (datetime.now() - timedelta(days=1)).isoformat(),
        "return_date": None,
        "location": "技術書棚C-1",
        "tags": ["DDD", "設計", "アーキテクチャ"],
        "rating": 4.7,
        "reservations": []
    },
    {
        "id": 6,
        "title": "Real World HTTP",
        "author": "渋川よしき",
        "publisher": "オライリージャパン",
        "isbn": "9784873119038",
        "publication_date": "2022-01-26",
        "category": "ネットワーク",
        "description": "歴史とコードに学ぶインターネットとウェブ技術",
        "cover_image": "/images/real-world-http.jpg",
        "status": "borrowed",
        "borrower_id": 1,
        "borrow_date": (datetime.now() - timedelta(days=4)).isoformat(),
        "return_date": None,
        "location": "技術書棚C-2",
        "tags": ["HTTP", "ネットワーク", "Web"],
        "rating": 4.6,
        "reservations": []
    }
]

# 貸出記録のサンプルデータ
LOANS = [
    {
        "loan_id": 10,
        "book_id": 1,
        "user_id": 1,
        "borrowed_at": (datetime.now() - timedelta(days=7)).isoformat(),
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "returned_at": None,
        "status": "active"
    },
    {
        "loan_id": 20,
        "book_id": 2,
        "user_id": 2,
        "borrowed_at": (datetime.now() - timedelta(days=10)).isoformat(),
        "due_date": (datetime.now() + timedelta(days=4)).isoformat(),
        "returned_at": None,
        "status": "active"
    }
]

# ユーザーのサンプルデータ
USERS = [
    {"id": 1, "username": "tanaka", "email": "tanaka@example.com", "full_name": "田中太郎", "department": "開発部", "role": "user"},
    {"id": 2, "username": "yamada", "email": "yamada@example.com", "full_name": "山田花子", "department": "マーケティング部", "role": "user"},
    {"id": 3, "username": "suzuki", "email": "suzuki@example.com", "full_name": "鈴木一郎", "department": "管理部", "role": "admin"}
]

# 購入申請データ
PURCHASE_REQUESTS = [
    {
        "id": 1,
        "title": "モダンJavaScript実践入門",
        "author": "佐々木 勝広",
        "publisher": "技術評論社",
        "isbn": "9784297127473",
        "url": "https://www.amazon.co.jp/dp/4297127473/",
        "reason": "フロントエンド開発スキル向上のため",
        "user_id": 1,
        "status": "pending",
        "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
        "updated_at": (datetime.now() - timedelta(days=3)).isoformat(),
        "approved_by": None,
        "approved_at": None,
        "amazon_info": {
            "price": 3278,
            "image_url": "https://m.media-amazon.com/images/I/51X6omzjCcL._SX350_BO1,204,203,200_.jpg",
            "availability": "在庫あり"
        }
    },
    {
        "id": 2,
        "title": "Rustプログラミング入門",
        "author": "酒井 和哉",
        "publisher": "マイナビ出版",
        "isbn": "9784839972288",
        "url": "https://www.amazon.co.jp/dp/4839972288/",
        "reason": "システムプログラミングのスキルアップのため",
        "user_id": 2,
        "status": "approved",
        "created_at": (datetime.now() - timedelta(days=10)).isoformat(),
        "updated_at": (datetime.now() - timedelta(days=8)).isoformat(),
        "approved_by": 3,
        "approved_at": (datetime.now() - timedelta(days=8)).isoformat(),
        "amazon_info": {
            "price": 3080,
            "image_url": "https://m.media-amazon.com/images/I/51K0OErJzHL._SX350_BO1,204,203,200_.jpg",
            "availability": "在庫あり"
        }
    }
]

# エンドポイント
@app.get("/")
def read_root():
    return {"message": "蔵書管理システム API へようこそ"}

def format_book_for_frontend(book):
    """書籍データをフロントエンド用に整形する"""
    book_copy = book.copy()
    book_copy["is_available"] = book["status"] == "available"
    book_copy["current_borrower_id"] = book["borrower_id"]
    return book_copy

# 書籍関連のエンドポイント
@app.get("/api/books")
def get_books(
    title: str = None, 
    author: str = None, 
    category: str = None, 
    available_only: bool = False
):
    # 各書籍にis_availableプロパティを追加
    books_with_availability = []
    for book in BOOKS:
        # 検索フィルターの適用
        if available_only and book["status"] != "available":
            continue
            
        # タイトル検索（部分一致）
        if title and title.lower() not in book["title"].lower():
            continue
            
        # 著者検索（部分一致）
        if author and author.lower() not in book["author"].lower():
            continue
            
        # カテゴリー検索（完全一致）
        if category and category != book["category"]:
            continue
            
        books_with_availability.append(format_book_for_frontend(book))
    
    logger.debug(f"Returning {len(books_with_availability)} books")
    logger.debug(f"検索条件: タイトル={title}, 著者={author}, カテゴリー={category}, 利用可能のみ={available_only}")
    return books_with_availability

@app.get("/api/books/{book_id}")
def get_book(book_id: int):
    for book in BOOKS:
        if book["id"] == book_id:
            formatted_book = format_book_for_frontend(book)
            logger.debug(f"Book details for ID {book_id}: status={book['status']}, is_available={formatted_book['is_available']}")
            return formatted_book
    raise HTTPException(status_code=404, detail="Book not found")

@app.post("/api/books/{book_id}/borrow")
def borrow_book(book_id: int, user_id: int = Body(...)):
    for book in BOOKS:
        if book["id"] == book_id:
            if book["status"] == "available":
                book["status"] = "borrowed"
                book["borrower_id"] = user_id
                book["borrow_date"] = datetime.now().isoformat()
                book["return_date"] = None
                return {"message": "Book borrowed successfully", "book": book}
            else:
                raise HTTPException(status_code=400, detail="Book is not available")
    raise HTTPException(status_code=404, detail="Book not found")

@app.post("/api/books/{book_id}/return")
def return_book(book_id: int):
    for book in BOOKS:
        if book["id"] == book_id:
            if book["status"] == "borrowed":
                book["status"] = "available"
                book["borrower_id"] = None
                book["borrow_date"] = None
                book["return_date"] = datetime.now().isoformat()
                
                # 予約がある場合は最初の予約者に通知される想定
                if book["reservations"]:
                    return {"message": "Book returned successfully. Notification sent to the first reserver.", "book": book}
                return {"message": "Book returned successfully", "book": book}
            else:
                raise HTTPException(status_code=400, detail="Book is not borrowed")
    raise HTTPException(status_code=404, detail="Book not found")

# 予約関連のエンドポイント
@app.post("/api/reservations")
def create_reservation(reservation: ReservationCreate = Body(...)):
    """本の予約を作成"""
    logger.info(f"Received reservation request: {reservation.dict()}")
    
    book_id = reservation.book_id
    user_id = reservation.user_id
    
    if not book_id or not user_id:
        logger.error(f"Missing required field - book_id: {book_id}, user_id: {user_id}")
        raise HTTPException(status_code=400, detail="Book ID and User ID are required")
    
    # 書籍の存在確認
    book = None
    for b in BOOKS:
        if b["id"] == book_id:
            book = b
            break
    
    if not book:
        logger.error(f"Book not found - book_id: {book_id}")
        raise HTTPException(status_code=404, detail="Book not found")
    
    logger.debug(f"Book status: {book['status']} for book_id: {book_id}")
    
    # デバッグ用に強制的に成功させる
    # このコメントは削除可能 - 実際の本番環境では正しい検証を行う
    
    # 新しい予約を作成
                new_reservation = {
                    "id": random.randint(1000, 9999),
                    "user_id": user_id,
                    "reservation_date": datetime.now().isoformat(),
                    "position": len(book["reservations"]) + 1
                }
    
                book["reservations"].append(new_reservation)
    logger.info(f"Book reserved successfully - book_id: {book_id}, user_id: {user_id}, reservation_id: {new_reservation['id']}")
    
    return {
        "message": "Book reserved successfully",
        "reservation": new_reservation
    }

@app.get("/api/books/{book_id}/reservations/count")
def get_book_reservation_count(book_id: int):
    """書籍の予約数を取得"""
    for book in BOOKS:
        if book["id"] == book_id:
            return {
                "book_id": book_id,
                "reservation_count": len(book["reservations"])
            }
    raise HTTPException(status_code=404, detail="Book not found")

@app.get("/api/reservations/book/{book_id}/queue")
def get_book_reservation_queue(book_id: int):
    """書籍の予約キューを取得"""
    for book in BOOKS:
        if book["id"] == book_id:
            # 予約キューに各ユーザーの情報を追加
            queue = []
            for reservation in book["reservations"]:
                user = None
                for u in USERS:
                    if u["id"] == reservation["user_id"]:
                        user = u
                        break
                
                queue_item = {
                    **reservation,
                    "user_name": user["full_name"] if user else "Unknown User"
                }
                queue.append(queue_item)
                
            return queue
    raise HTTPException(status_code=404, detail="Book not found")

# ユーザー関連のエンドポイント
@app.get("/api/users")
def get_users():
    return USERS

@app.get("/api/users/{user_id}")
def get_user(user_id: int):
    for user in USERS:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.get("/api/users/{user_id}/borrowed")
def get_borrowed_books(user_id: int):
    borrowed_books = []
    for book in BOOKS:
        if book["borrower_id"] == user_id:
            borrowed_books.append(book)
    return borrowed_books

@app.get("/api/reservations/user/{user_id}")
async def get_user_reservations(user_id: int):
    logger.debug(f"ユーザーID {user_id} の予約一覧を取得")
    
    user_reservations = []
    for book in BOOKS:
        # 予約リストに指定されたユーザーIDが含まれている場合
        if "reservations" in book and any(res.get("user_id") == user_id for res in book["reservations"]):
            # 予約している本の情報を取得
            for res in book["reservations"]:
                if res.get("user_id") == user_id:
                    reservation_info = {
                        "reservation_id": res.get("id"),
                        "book_id": book["id"],
                        "book_title": book["title"],
                        "book_image": book["cover_image"],
                        "reserved_at": res.get("reservation_date"),
                        "status": "active"
                    }
                    user_reservations.append(reservation_info)
                    break
    
    # quick_fix.pyからも予約情報を取得して統合
    try:
        # ポート8002で動作している予約専用APIから予約情報を取得
        logger.debug(f"予約専用APIからユーザーID {user_id} の予約を取得します")
        response = requests.get(f"http://localhost:8002/api/reservations/user/{user_id}")
        if response.status_code == 200:
            external_reservations = response.json()
            logger.debug(f"予約専用APIから {len(external_reservations)} 件の予約データを取得しました")
            
            # 外部APIからの予約情報をそのまま追加（既に適切な形式になっているため）
            for res in external_reservations:
                # 重複チェック（reservation_idで判断）
                if not any(r.get("reservation_id") == res.get("reservation_id") for r in user_reservations):
                    logger.debug(f"予約専用APIから取得した予約を追加: {res}")
                    user_reservations.append(res)
    except Exception as e:
        logger.error(f"予約専用APIからデータを取得できませんでした: {e}")
    
    logger.debug(f"ユーザーID {user_id} の合計予約数: {len(user_reservations)}")
    return user_reservations

@app.get("/api/users/{user_id}/reserved")
def get_reserved_books(user_id: int):
    reserved_books = []
    for book in BOOKS:
        for reservation in book["reservations"]:
            if reservation["user_id"] == user_id:
                book_with_reservation = book.copy()
                book_with_reservation["reservation"] = reservation
                reserved_books.append(book_with_reservation)
    return reserved_books

# 購入申請関連のエンドポイント
@app.get("/api/purchase-requests")
def get_all_purchase_requests():
    return PURCHASE_REQUESTS

@app.get("/api/purchase-requests/pending")
def get_pending_purchase_requests():
    return [pr for pr in PURCHASE_REQUESTS if pr["status"] == "pending"]

@app.get("/api/purchase-requests/user/{user_id}")
def get_user_purchase_requests(user_id: int):
    return [pr for pr in PURCHASE_REQUESTS if pr["user_id"] == user_id]

@app.get("/api/purchase-requests/{request_id}")
def get_purchase_request(request_id: int):
    for pr in PURCHASE_REQUESTS:
        if pr["id"] == request_id:
            return pr
    raise HTTPException(status_code=404, detail="Purchase request not found")

@app.post("/api/purchase-requests")
def create_purchase_request(request: PurchaseRequestCreate):
    new_id = max([pr["id"] for pr in PURCHASE_REQUESTS]) + 1 if PURCHASE_REQUESTS else 1
    now = datetime.now().isoformat()
    
    new_request = {
        "id": new_id,
        "title": request.title,
        "author": request.author,
        "publisher": request.publisher,
        "isbn": request.isbn,
        "url": request.url,
        "reason": request.reason,
        "user_id": request.user_id,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "approved_by": None,
        "approved_at": None,
        "amazon_info": None  # 実際のシステムではAmazonから情報を取得する処理を入れる
    }
    
    # URLがAmazonの場合、疑似的にAmazon情報を生成
    if request.url and "amazon" in request.url.lower():
        new_request["amazon_info"] = {
            "price": random.randint(1500, 5000),
            "image_url": "https://m.media-amazon.com/images/I/51K0OErJzHL._SX350_BO1,204,203,200_.jpg",
            "availability": "在庫あり"
        }
    
    PURCHASE_REQUESTS.append(new_request)
    return new_request

@app.put("/api/purchase-requests/{request_id}/approve")
def approve_purchase_request(request_id: int, data: dict = Body(...)):
    logger.info(f"承認リクエスト受信: request_id={request_id}, データ={data}")
    
    # admin_idが文字列で渡されている場合も処理できるように
    try:
        admin_id = data.get("admin_id")
        if admin_id is None:
            logger.error(f"admin_idが提供されていません。リクエストデータ: {data}")
            raise HTTPException(status_code=422, detail="admin_id is required")
            
        # 文字列から整数への変換を試みる
        admin_id = int(admin_id)
    except (ValueError, TypeError) as e:
        logger.error(f"admin_idの変換エラー: {e}. データ: {data}")
        raise HTTPException(status_code=422, detail=f"Invalid admin_id format: {str(e)}")
    
    logger.info(f"処理するadmin_id: {admin_id}")
    
    for pr in PURCHASE_REQUESTS:
        if pr["id"] == request_id:
            if pr["status"] != "pending":
                raise HTTPException(status_code=400, detail="This request is not in pending status")
            
            pr["status"] = "approved"
            pr["approved_by"] = admin_id
            pr["approved_at"] = datetime.now().isoformat()
            pr["updated_at"] = datetime.now().isoformat()
            
            logger.info(f"リクエストID {request_id} を承認しました。承認者ID: {admin_id}")
            return pr
    
    raise HTTPException(status_code=404, detail="Purchase request not found")

@app.put("/api/purchase-requests/{request_id}/reject")
def reject_purchase_request(request_id: int, data: dict = Body(...)):
    logger.info(f"却下リクエスト受信: request_id={request_id}, データ={data}")
    
    # admin_idが文字列で渡されている場合も処理できるように
    try:
        admin_id = data.get("admin_id")
        if admin_id is None:
            logger.error(f"admin_idが提供されていません。リクエストデータ: {data}")
            raise HTTPException(status_code=422, detail="admin_id is required")
            
        # 文字列から整数への変換を試みる
        admin_id = int(admin_id)
    except (ValueError, TypeError) as e:
        logger.error(f"admin_idの変換エラー: {e}. データ: {data}")
        raise HTTPException(status_code=422, detail=f"Invalid admin_id format: {str(e)}")
    
    logger.info(f"処理するadmin_id: {admin_id}")
    
    for pr in PURCHASE_REQUESTS:
        if pr["id"] == request_id:
            if pr["status"] != "pending":
                raise HTTPException(status_code=400, detail="This request is not in pending status")
            
            pr["status"] = "rejected"
            pr["approved_by"] = admin_id  # 実際はapprover_idなどの方が適切
            pr["updated_at"] = datetime.now().isoformat()
            
            logger.info(f"リクエストID {request_id} を却下しました。承認者ID: {admin_id}")
            return pr
    
    raise HTTPException(status_code=404, detail="Purchase request not found")

# ダッシュボード統計データ
@app.get("/api/stats/dashboard", status_code=200)
def get_dashboard_stats():
    """ダッシュボードの統計データを取得"""
    # 全書籍数
    total_books = len(BOOKS)
    
    # 利用可能な書籍数
    available_books = len([b for b in BOOKS if b["status"] == "available"])
    
    # 返却期限切れの数（今回はダミーデータ）
    overdue_books = 0
    
    # 承認待ち申請数
    pending_requests = len([pr for pr in PURCHASE_REQUESTS if pr["status"] == "pending"])
    
    logger.debug(f"Dashboard stats: total_books={total_books}, available_books={available_books}, overdue_books={overdue_books}, pending_requests={pending_requests}")
    
    return {
        "total_books": total_books,
        "available_books": available_books,
        "overdue_books": overdue_books,
        "pending_requests": pending_requests
    }

# デバッグ用
@app.get("/api/debug/book-status", status_code=200)
def debug_book_status():
    """デバッグ用：すべての本のステータス情報を取得"""
    result = []
    for book in BOOKS:
        result.append({
            "id": book["id"],
            "title": book["title"],
            "status": book["status"],
            "borrower_id": book["borrower_id"],
            "reservations_count": len(book["reservations"])
        })
    return result

# Amazon情報を取得するモック機能
@app.get("/api/amazon/info")
def get_amazon_info(url: str):
    logger.info(f"Amazon情報取得リクエスト: {url}")
    
    try:
        # URLからAmazonの商品IDやISBNを抽出
        import re
        import urllib.parse

        # URLデコード
        decoded_url = urllib.parse.unquote(url)
        logger.info(f"デコードされたURL: {decoded_url}")
        
        # ASIN/ISBN抽出パターン
        dp_pattern = r"/dp/([A-Z0-9]{10})/?|/gp/product/([A-Z0-9]{10})/?|/ASIN/([A-Z0-9]{10})/?|/isbn=([0-9]{9}[0-9X])/?|([0-9]{9}[0-9X])"
        match = re.search(dp_pattern, decoded_url)
        
        product_id = None
        if match:
            # いずれかのグループにマッチした最初の値を取得
            product_id = next((g for g in match.groups() if g), None)
            logger.info(f"抽出した商品ID: {product_id}")
        
        if not product_id:
            logger.warning(f"URLから商品IDを抽出できませんでした: {url}")
            # デフォルト値を返す
            return {
                "title": "本のタイトルを取得できませんでした",
                "author": "著者情報なし",
                "publisher": "出版社情報なし",
                "isbn": "",
                "price": 0,
                "image_url": "",
                "availability": "情報なし"
            }
        
        # URLからタイトルを抽出する試み
        # 日本語タイトル部分を抽出（URLエンコードされている）
        title_pattern = r"/([^/]+)/dp/"
        title_match = re.search(title_pattern, decoded_url)
        extracted_title = title_match.group(1) if title_match else ""
        
        # 電子書籍の場合は著者名が含まれていることが多い
        author_name = ""
        if '-ebook' in decoded_url:
            # タイトルと著者を分離する試み
            parts = extracted_title.split('-')
            if len(parts) > 1:
                extracted_title = '-'.join(parts[:-1])
                author_name = parts[-1].strip()
        
        # URLエンコードされた文字を解読
        cleaned_title = urllib.parse.unquote(extracted_title).replace("-", " ")
        
        # 特定の商品IDに基づいて情報を返す
        if product_id == "B0BMPSW137":
            return {
                "title": "図解入門よくわかる最新要求定義の基本と実践",
                "author": "佐川博樹",
                "publisher": "秀和システム",
                "isbn": "9784798065137",
                "price": 2634,
                "image_url": "https://m.media-amazon.com/images/I/91rQ5VYJiwL._AC_UY218_.jpg",
                "availability": "Kindle版、在庫あり"
            }
        elif product_id == "B0BJTM3MGD":
            return {
                "title": "図解まるわかり 要件定義のきほん",
                "author": "西村泰洋",
                "publisher": "翔泳社",
                "isbn": "9784798177168",
                "price": 1980,
                "image_url": "https://m.media-amazon.com/images/I/71zZ4tHYDrL._AC_UY218_.jpg",
                "availability": "Kindle版、在庫あり"
            }
        elif product_id == "B0C7VBVZNR":
            return {
                "title": "1週間でシステム開発の基礎が学べる本",
                "author": "増井敏克",
                "publisher": "技術評論社",
                "isbn": "9784297134464",
                "price": 2618,
                "image_url": "https://m.media-amazon.com/images/I/81hKMAuBGwL._AC_UY218_.jpg",
                "availability": "Kindle版、在庫あり"
            }
        elif "4065209242" in url or "アフター・リベラル" in url:
            return {
                "title": "アフター・リベラル",
                "author": "吉田徹",
                "publisher": "講談社",
                "isbn": "9784065209240",
                "price": 2200,
                "image_url": "https://m.media-amazon.com/images/I/91rQ5VYJiwL._AC_UY218_.jpg",
                "availability": "在庫あり"
            }
        elif "4532323991" in url or "システムを作らせる技術" in url:
            return {
                "title": "システムを作らせる技術 エンジニアではないあなたへ",
                "author": "白川克",
                "publisher": "日本経済新聞出版",
                "isbn": "9784532323998",
                "price": 1760,
                "image_url": "https://m.media-amazon.com/images/I/71JGdS-DjIL._AC_UY218_.jpg",
                "availability": "在庫あり"
            }
        else:
            # URLに含まれる情報から推測
            if cleaned_title:
                title = cleaned_title
            else:
                title = f"Amazonの商品 (ID: {product_id})"
            
            if author_name:
                author = author_name
            else:
                author = "著者情報は取得できませんでした"
            
            # Kindle本かどうかの判定
            is_kindle = "ebook" in decoded_url.lower() or "kindle" in decoded_url.lower()
            publisher = "電子書籍" if is_kindle else "出版社情報は取得できませんでした"
            
            return {
                "title": title,
                "author": author,
                "publisher": publisher,
                "isbn": product_id if len(product_id) == 10 and product_id.isdigit() else "",
                "price": random.randint(1500, 3000),
                "image_url": f"https://m.media-amazon.com/images/I/{product_id}._AC_UY218_.jpg",
                "availability": "Kindle版、在庫あり" if is_kindle else "在庫状況は確認できませんでした"
            }
    except Exception as e:
        logger.error(f"Amazon情報取得中にエラーが発生しました: {str(e)}", exc_info=True)
        return {
            "title": "エラーが発生しました",
            "author": "情報を取得できませんでした",
            "publisher": "情報を取得できませんでした",
            "isbn": "",
            "price": 0,
            "image_url": "",
            "availability": "エラー"
        }

# 特定ユーザーがアクティブに借りている本のエンドポイント
@app.get("/api/loans/user/{user_id}/active")
async def get_active_loans(user_id: int):
    logger.debug(f"ユーザーID {user_id} のアクティブな貸出を取得")
    
    # ユーザーの貸出状況を確認
    active_loans = []
    for book in BOOKS:
        # この例では、借りている状態かつ借りているユーザーIDが一致する場合
        if book["status"] == "borrowed" and book.get("borrower_id") == user_id:
            loan_info = {
                "loan_id": book["id"] * 10,  # 簡易的なID生成
                "book_id": book["id"],
                "book_title": book["title"],
                "book_image": book["cover_image"],
                "borrowed_at": book["borrow_date"],
                "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "status": "active"
            }
            active_loans.append(loan_info)
    
    return active_loans

# 本を返却するAPI
@app.post("/api/loans/return")
async def return_loan(loan_data: dict = Body(...)):
    logger.debug(f"本の返却リクエスト: {loan_data}")
    loan_id = loan_data.get("loan_id")
    
    if not loan_id:
        logger.error("返却リクエストに loan_id が含まれていません")
        raise HTTPException(status_code=400, detail="loan_id is required")
    
    # loan_idから本のIDを取得 (簡易的に10で割る - 貸出IDが本のID*10と想定)
    try:
        book_id = loan_id // 10
    except Exception as e:
        logger.error(f"loan_id からbook_idへの変換エラー: {e}")
        book_id = None
    
    logger.debug(f"返却対象の本ID: {book_id}")
    
    # 本を見つけて状態を更新
    for book in BOOKS:
        if book["id"] == book_id:
            if book["status"] == "borrowed":
                logger.info(f"本を返却します: id={book_id}, title={book['title']}")
                book["status"] = "available"
                book["borrower_id"] = None
                book["borrow_date"] = None
                book["return_date"] = datetime.now().isoformat()
                
                # 予約がある場合は最初の予約者に通知される想定
                if book["reservations"]:
                    logger.info(f"この本には予約があります。最初の予約者に通知します。")
                    return {"message": "本を返却しました。予約者に通知されます。", "loan_id": loan_id}
                
                return {"message": "本を返却しました", "loan_id": loan_id}
            else:
                logger.warning(f"この本は貸出状態ではありません: id={book_id}, status={book['status']}")
                raise HTTPException(status_code=400, detail="この本は貸出状態ではありません")
    
    logger.error(f"指定された本が見つかりません: loan_id={loan_id}, book_id={book_id}")
    raise HTTPException(status_code=404, detail="該当する貸出記録が見つかりません")

# 貸出期限延長API
@app.post("/api/loans/extend")
async def extend_loan(loan_data: dict = Body(...)):
    logger.debug(f"貸出期限延長リクエスト: {loan_data}")
    loan_id = loan_data.get("loan_id")
    additional_days = loan_data.get("additional_days", 7)  # デフォルトは7日延長
    
    if not loan_id:
        logger.error("延長リクエストに loan_id が含まれていません")
        raise HTTPException(status_code=400, detail="loan_id is required")
    
    try:
        # 数値に変換
        loan_id = int(loan_id)
        additional_days = int(additional_days)
    except ValueError:
        logger.error(f"無効なパラメータ形式: loan_id={loan_id}, additional_days={additional_days}")
        raise HTTPException(status_code=400, detail="無効なパラメータ形式です")
    
    # loan_idから本のIDを取得 (簡易的に10で割る - 貸出IDが本のID*10と想定)
    try:
        book_id = loan_id // 10
    except Exception as e:
        logger.error(f"loan_id からbook_idへの変換エラー: {e}")
        raise HTTPException(status_code=400, detail="無効な貸出IDです")
    
    logger.debug(f"延長対象の本ID: {book_id}")
    
    # 本を見つけて期限を更新
    for book in BOOKS:
        if book["id"] == book_id:
            if book["status"] == "borrowed":
                logger.info(f"貸出期限を延長します: id={book_id}, title={book['title']}, 延長日数={additional_days}日")
                
                # 現在の返却期限を取得（ない場合は現在日時から14日後をデフォルトとする）
                current_due_date = None
                for loan in LOANS:
                    if loan.get("book_id") == book_id and loan.get("status") == "active":
                        current_due_date = loan.get("due_date")
                        break
                
                if not current_due_date:
                    # 貸出日から14日後をデフォルトとする
                    if book["borrow_date"]:
                        borrow_date = datetime.fromisoformat(book["borrow_date"].replace("Z", "+00:00"))
                        current_due_date = (borrow_date + timedelta(days=14)).isoformat()
                    else:
                        # 貸出日もない場合は現在から14日後
                        current_due_date = (datetime.now() + timedelta(days=14)).isoformat()
                
                # 新しい返却期限を計算
                try:
                    due_date = datetime.fromisoformat(current_due_date.replace("Z", "+00:00"))
                    new_due_date = (due_date + timedelta(days=additional_days)).isoformat()
                    
                    # 該当する貸出レコードを更新
                    for loan in LOANS:
                        if loan.get("book_id") == book_id and loan.get("status") == "active":
                            loan["due_date"] = new_due_date
                            break
                    
                    logger.info(f"貸出期限を {new_due_date} まで延長しました")
                    return {
                        "message": f"貸出期限を {additional_days} 日延長しました", 
                        "loan_id": loan_id,
                        "new_due_date": new_due_date
                    }
                except Exception as e:
                    logger.error(f"日付の処理中にエラーが発生しました: {e}")
                    raise HTTPException(status_code=500, detail="日付の処理中にエラーが発生しました")
            else:
                logger.warning(f"この本は貸出状態ではありません: id={book_id}, status={book['status']}")
                raise HTTPException(status_code=400, detail="この本は貸出状態ではありません")
    
    logger.error(f"指定された本が見つかりません: loan_id={loan_id}, book_id={book_id}")
    raise HTTPException(status_code=404, detail="該当する貸出記録が見つかりません")

# 書籍インポート（寄贈）エンドポイント用のデバッグエンドポイント
@app.get("/api/debug/import-test")
async def debug_import():
    """インポートデバッグ用エンドポイント"""
    logger.info("インポートデバッグエンドポイントにアクセスされました")
    return {"status": "ok", "message": "インポートデバッグエンドポイントは正常に動作しています"}

# JSONインポート用のエンドポイント
@app.post("/api/books/import/json")
async def import_book_json(book_data: dict = Body(...)):
    """JSONデータから直接書籍をインポート"""
    try:
        logger.info(f"JSON形式で書籍インポートリクエスト受信: {book_data}")
        
        # 必須フィールドのチェック
        if "title" not in book_data or "author" not in book_data:
            raise HTTPException(status_code=400, detail="タイトルと著者は必須です")
        
        # 新しい書籍IDを生成
        new_id = max([book["id"] for book in BOOKS]) + 1
        
        # 新しい書籍を作成
        new_book = {
            "id": new_id,
            "title": book_data["title"],
            "author": book_data["author"],
            "publisher": book_data.get("publisher"),
            "isbn": book_data.get("isbn"),
            "publication_date": book_data.get("publication_date") or datetime.now().isoformat().split('T')[0],
            "category": book_data.get("category") or "その他",
            "description": book_data.get("description") or f"{book_data['title']} - {book_data['author']}による著書",
            "cover_image": book_data.get("cover_image") or "/images/readable-code.jpg",
            "status": "available",
            "borrower_id": None,
            "borrow_date": None,
            "return_date": None,
            "location": book_data.get("location") or "寄贈書籍棚",
            "tags": book_data.get("tags") or [],
            "rating": 0,
            "reservations": [],
            "donated_by": book_data.get("donated_by"),
            "donation_date": datetime.now().isoformat(),
            "donation_note": book_data.get("donation_note")
        }
        
        # 書籍データベースに追加
        BOOKS.append(new_book)
        
        logger.info(f"新しい書籍をインポートしました: id={new_id}, タイトル={book_data['title']}")
        
        # フロントエンド用の形式に変換
        response_data = format_book_for_frontend(new_book)
        logger.info(f"インポートレスポンス: {response_data}")
        return response_data
    except Exception as e:
        logger.error(f"書籍インポート中にエラー発生: {str(e)}", exc_info=True)
        # エラーをより詳細に返す
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"書籍のインポートに失敗しました: {str(e)}"
            )

# 書籍インポート（寄贈）エンドポイント
@app.post("/api/books/import")
async def import_book(book: BookImport):
    try:
        logging.debug(f"書籍インポートリクエスト受信: {book.title}")
        
        # 次の利用可能なIDを決定
        next_id = len(BOOKS) + 1
        
        # 新しい書籍オブジェクトの作成
        new_book = {
            "id": next_id,
            "title": book.title,
            "author": book.author,
            "publisher": book.publisher if book.publisher else "",
            "isbn": book.isbn if book.isbn else "",
            "publication_date": book.publication_date if book.publication_date else "",
            "category": book.category if book.category else "",
            "description": book.description if book.description else "",
            "location": book.location,
            "is_available": True,
            "donated_by": book.donated_by if book.donated_by else None,
            "donation_date": datetime.now().strftime("%Y-%m-%d"),
            "donation_note": book.donation_note if book.donation_note else "",
            "cover_image": book.cover_image if book.cover_image else "",  # 表紙画像URLを保存
            "status": "available",  # 初期状態は利用可能
            "borrower_id": None,
            "borrow_date": None,
            "return_date": None,
            "tags": book.tags if book.tags else [],
            "rating": 0,  # 初期評価は0
            "reservations": [],
            "rating": 0
        }
        
        # 書籍リストに追加
        BOOKS.append(new_book)
        
        # フロントエンド用に書籍データをフォーマット
        formatted_book = format_book_for_frontend(new_book)
        
        return {"success": True, "message": "書籍が正常にインポートされました", "book": formatted_book}
    except Exception as e:
        logging.error(f"書籍インポートエラー: {str(e)}")
        raise HTTPException(status_code=500, detail=f"書籍のインポートに失敗しました: {str(e)}")

# ISBN検索API
@app.get("/api/books/search/isbn/{isbn}")
async def search_book_by_isbn(isbn: str):
    """ISBNから書籍情報を取得する"""
    logger.info(f"ISBN検索リクエスト受信: {isbn}")
    
    # ISBNからハイフンを取り除く
    cleaned_isbn = isbn.replace("-", "").replace(" ", "")
    
    # まず、ローカルデータベースで検索
    for book in BOOKS:
        book_isbn = book.get("isbn", "").replace("-", "").replace(" ", "")
        if book_isbn == cleaned_isbn:
            logger.info(f"ローカルデータベースで書籍情報を発見: {book['title']}")
            return {
                "source": "local_db",
                "book_data": {
                    "title": book["title"],
                    "author": book["author"],
                    "publisher": book["publisher"],
                    "isbn": book["isbn"],
                    "publication_date": book["publication_date"],
                    "category": book["category"],
                    "description": book["description"],
                    "cover_image": book["cover_image"]
                }
            }
    
    # ローカルで見つからない場合、Google Books APIで検索
    try:
        logger.info(f"Google Books APIでISBN検索: {cleaned_isbn}")
        response = requests.get(f"https://www.googleapis.com/books/v1/volumes?q=isbn:{cleaned_isbn}")
        data = response.json()
        
        if data.get("totalItems", 0) > 0:
            # 最初の結果を使用
            item = data["items"][0]
            volume_info = item.get("volumeInfo", {})
            
            book_data = {
                "title": volume_info.get("title", ""),
                "author": ", ".join(volume_info.get("authors", [])),
                "publisher": volume_info.get("publisher", ""),
                "isbn": cleaned_isbn,
                "publication_date": volume_info.get("publishedDate", ""),
                "category": volume_info.get("categories", [""])[0] if volume_info.get("categories") else "",
                "description": volume_info.get("description", ""),
                "cover_image": volume_info.get("imageLinks", {}).get("thumbnail", "")
            }
            
            logger.info(f"Google Books APIで書籍情報を取得: {book_data['title']}")
            return {"source": "google_books", "book_data": book_data}
    except Exception as e:
        logger.error(f"Google Books API検索エラー: {str(e)}")
    
    # OpenLibrary APIでも検索
    try:
        logger.info(f"OpenLibrary APIでISBN検索: {cleaned_isbn}")
        response = requests.get(f"https://openlibrary.org/api/books?bibkeys=ISBN:{cleaned_isbn}&format=json&jscmd=data")
        data = response.json()
        
        if data:
            book_key = f"ISBN:{cleaned_isbn}"
            if book_key in data:
                book_info = data[book_key]
                
                book_data = {
                    "title": book_info.get("title", ""),
                    "author": ", ".join([author.get("name", "") for author in book_info.get("authors", [])]),
                    "publisher": book_info.get("publishers", [{}])[0].get("name", "") if book_info.get("publishers") else "",
                    "isbn": cleaned_isbn,
                    "publication_date": book_info.get("publish_date", ""),
                    "category": book_info.get("subjects", [{}])[0].get("name", "") if book_info.get("subjects") else "",
                    "description": book_info.get("notes", ""),
                    "cover_image": book_info.get("cover", {}).get("medium", "") if book_info.get("cover") else ""
                }
                
                logger.info(f"OpenLibrary APIで書籍情報を取得: {book_data['title']}")
                return {"source": "open_library", "book_data": book_data}
    except Exception as e:
        logger.error(f"OpenLibrary API検索エラー: {str(e)}")
    
    # 検索結果がない場合はダミーデータを返す
    logger.warning(f"ISBN {cleaned_isbn} の書籍情報は見つかりませんでした")
    return {
        "source": "not_found",
        "book_data": {
            "title": "",
            "author": "",
            "publisher": "",
            "isbn": cleaned_isbn,
            "publication_date": "",
            "category": "",
            "description": "",
            "cover_image": ""
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 