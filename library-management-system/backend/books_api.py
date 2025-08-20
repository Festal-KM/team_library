#!/usr/bin/env python
import json
import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="図書館管理システム - メインAPI")

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイルを提供する設定
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# サンプルの書籍データ
BOOKS = [
    {
        "id": 1,
        "title": "リーダブルコード",
        "author": "Dustin Boswell, Trevor Foucher",
        "publisher": "O'Reilly Japan",
        "isbn": "978-4873115658",
        "publication_date": "2012-06-23",
        "category": "プログラミング",
        "description": "より良いコードを書くためのシンプルで実践的なテクニックを紹介する本。",
        "cover_image": "/images/readable-code.jpg",
        "is_available": False,
        "current_borrower_id": 2,
        "added_at": "2022-01-15T09:30:00Z",
        "location": "技術書コーナー A-1",
        "tags": ["プログラミング", "コードレビュー", "可読性"]
    },
    {
        "id": 2,
        "title": "達人プログラマー",
        "author": "Andrew Hunt, David Thomas",
        "publisher": "アスキードワンゴ",
        "isbn": "978-4048930598",
        "publication_date": "2016-11-18",
        "category": "プログラミング",
        "description": "プログラマーとしての姿勢や心構えから実践的なコーディングテクニックまで幅広く解説。",
        "cover_image": "/images/pragmatic-programmer.jpg",
        "is_available": False,
        "current_borrower_id": 1,
        "added_at": "2022-02-05T14:20:00Z",
        "location": "技術書コーナー A-2",
        "tags": ["プログラミング", "ベストプラクティス", "キャリア"]
    },
    {
        "id": 3,
        "title": "Clean Architecture",
        "author": "Robert C. Martin",
        "publisher": "アスキードワンゴ",
        "isbn": "978-4048930641",
        "publication_date": "2018-07-27",
        "category": "ソフトウェア設計",
        "description": "ソフトウェア構造とアーキテクチャの原則について解説した名著。",
        "cover_image": "/images/clean-architecture.jpg",
        "is_available": False,
        "current_borrower_id": 3,
        "added_at": "2022-03-10T11:45:00Z",
        "location": "技術書コーナー B-1",
        "tags": ["アーキテクチャ", "設計", "SOLID原則"]
    },
    {
        "id": 4,
        "title": "オブジェクト指向設計実践ガイド",
        "author": "Sandi Metz",
        "publisher": "技術評論社",
        "isbn": "978-4774178462",
        "publication_date": "2016-08-26",
        "category": "ソフトウェア設計",
        "description": "オブジェクト指向プログラミングの実践的な設計手法を学べる一冊。",
        "cover_image": "/images/practical-object-oriented-design.jpg",
        "is_available": False,
        "current_borrower_id": 2,
        "added_at": "2022-04-20T10:15:00Z",
        "location": "技術書コーナー B-2",
        "tags": ["オブジェクト指向", "設計", "Ruby"]
    },
    {
        "id": 5,
        "title": "エンジニアのためのドメイン駆動設計入門",
        "author": "秋野 昌樹",
        "publisher": "技術評論社",
        "isbn": "978-4297105747",
        "publication_date": "2019-10-26",
        "category": "ソフトウェア設計",
        "description": "ドメイン駆動設計の基本概念と実践方法をわかりやすく解説。",
        "cover_image": "/images/domain-driven-design.jpg",
        "is_available": False,
        "current_borrower_id": 3,
        "added_at": "2022-05-03T16:30:00Z",
        "location": "技術書コーナー B-3",
        "tags": ["DDD", "設計", "アーキテクチャ"]
    },
    {
        "id": 6,
        "title": "Real World HTTP",
        "author": "渋川 よしき",
        "publisher": "オライリージャパン",
        "isbn": "978-4873119038",
        "publication_date": "2020-04-22",
        "category": "ネットワーク",
        "description": "HTTPの仕様から歴史、活用方法までを網羅的に解説。",
        "cover_image": "/images/real-world-http.jpg",
        "is_available": False,
        "current_borrower_id": 1,
        "added_at": "2022-06-12T13:40:00Z",
        "location": "技術書コーナー C-1",
        "tags": ["HTTP", "ネットワーク", "Web"]
    }
]

# ユーザーデータ
USERS = [
    {
        "id": 1,
        "name": "田中 太郎",
        "email": "tanaka@example.com",
        "role": "user",
        "department": "開発部",
        "joined_at": "2020-04-01T09:00:00Z"
    },
    {
        "id": 2,
        "name": "佐藤 次郎",
        "email": "sato@example.com",
        "role": "user",
        "department": "デザイン部",
        "joined_at": "2021-04-01T09:00:00Z"
    },
    {
        "id": 3,
        "name": "鈴木 三郎",
        "email": "suzuki@example.com",
        "role": "admin",
        "department": "情報システム部",
        "joined_at": "2019-04-01T09:00:00Z"
    }
]

# 貸出データ
LOANS = [
    {
        "id": 1,
        "book_id": 1,
        "user_id": 2,
        "borrowed_at": "2023-01-05T10:30:00Z",
        "due_date": "2023-01-19T10:30:00Z",
        "returned_at": None,
        "is_overdue": False
    },
    {
        "id": 2,
        "book_id": 2,
        "user_id": 1,
        "borrowed_at": "2023-01-10T13:45:00Z",
        "due_date": "2023-01-24T13:45:00Z",
        "returned_at": None,
        "is_overdue": False
    },
    {
        "id": 3,
        "book_id": 3,
        "user_id": 3,
        "borrowed_at": "2023-01-15T09:20:00Z",
        "due_date": "2023-01-29T09:20:00Z",
        "returned_at": None,
        "is_overdue": False
    },
    {
        "id": 4,
        "book_id": 4,
        "user_id": 2,
        "borrowed_at": "2023-01-20T16:15:00Z",
        "due_date": "2023-02-03T16:15:00Z",
        "returned_at": None,
        "is_overdue": False
    },
    {
        "id": 5,
        "book_id": 5,
        "user_id": 3,
        "borrowed_at": "2023-01-25T11:10:00Z",
        "due_date": "2023-02-08T11:10:00Z",
        "returned_at": None,
        "is_overdue": False
    },
    {
        "id": 6,
        "book_id": 6,
        "user_id": 1,
        "borrowed_at": "2023-01-30T14:50:00Z",
        "due_date": "2023-02-13T14:50:00Z",
        "returned_at": None,
        "is_overdue": False
    }
]

# 予約データ
RESERVATIONS = [
    {
        "reservation_id": 1,
        "book_id": 2,
        "user_id": 3,
        "reserved_at": "2023-02-01T10:30:00Z",
        "status": "active"
    }
]

# 購入リクエストデータ
PURCHASE_REQUESTS = [
    {
        "id": 1,
        "user_id": 2,
        "title": "ゼロから作るDeep Learning",
        "author": "斎藤 康毅",
        "amazon_url": "https://www.amazon.co.jp/dp/4873117585/",
        "reason": "機械学習の基礎を学ぶため",
        "status": "pending",
        "created_at": "2023-02-10T10:15:00Z",
        "price": 3740,
        "publisher": "オライリージャパン",
        "isbn": "978-4873117584",
        "cover_image": "/images/deep-learning.jpg"
    }
]

@app.get("/")
def read_root():
    return {"message": "Welcome to Library Management System API"}

@app.get("/api/books")
def get_books(title: Optional[str] = None, author: Optional[str] = None, category: Optional[str] = None, available_only: bool = False):
    logger.info(f"書籍一覧取得リクエスト: title={title}, author={author}, category={category}, available_only={available_only}")
    
    filtered_books = BOOKS
    
    # タイトルでフィルタリング
    if title:
        filtered_books = [book for book in filtered_books if title.lower() in book["title"].lower()]
    
    # 著者でフィルタリング
    if author:
        filtered_books = [book for book in filtered_books if author.lower() in book["author"].lower()]
    
    # カテゴリでフィルタリング
    if category:
        filtered_books = [book for book in filtered_books if category.lower() == book["category"].lower()]
    
    # 利用可能な本のみでフィルタリング
    if available_only:
        filtered_books = [book for book in filtered_books if book["is_available"]]
    
    logger.info(f"フィルタリング後の書籍数: {len(filtered_books)}")
    return filtered_books

@app.get("/api/books/{book_id}")
def get_book(book_id: int):
    logger.info(f"書籍詳細取得リクエスト: book_id={book_id}")
    
    for book in BOOKS:
        if book["id"] == book_id:
            return book
    
    logger.error(f"書籍が見つかりません: book_id={book_id}")
    raise HTTPException(status_code=404, detail="書籍が見つかりません")

@app.get("/api/users")
def get_users():
    logger.info("ユーザー一覧取得リクエスト")
    return USERS

@app.get("/api/users/{user_id}")
def get_user(user_id: int):
    logger.info(f"ユーザー詳細取得リクエスト: user_id={user_id}")
    
    for user in USERS:
        if user["id"] == user_id:
            return user
    
    logger.error(f"ユーザーが見つかりません: user_id={user_id}")
    raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

@app.get("/api/loans")
def get_loans():
    logger.info("貸出一覧取得リクエスト")
    return LOANS

@app.get("/api/loans/user/{user_id}/active")
def get_user_active_loans(user_id: int):
    logger.info(f"ユーザーの現在の貸出取得リクエスト: user_id={user_id}")
    
    active_loans = [loan for loan in LOANS if loan["user_id"] == user_id and loan["returned_at"] is None]
    
    # 書籍情報を付加
    result = []
    for loan in active_loans:
        book = next((b for b in BOOKS if b["id"] == loan["book_id"]), None)
        if book:
            loan_with_book = loan.copy()
            loan_with_book["book"] = book
            result.append(loan_with_book)
    
    return result

@app.get("/api/reservations/user/{user_id}")
def get_user_reservations(user_id: int):
    logger.info(f"ユーザーID {user_id} の予約一覧を取得")
    
    # このユーザーに関連する予約を集める
    user_reservations = []
    for reservation in RESERVATIONS:
        if reservation["user_id"] == user_id and reservation["status"] == "active":
            book_id = reservation["book_id"]
            book = next((b for b in BOOKS if b["id"] == book_id), None)
            
            if book:
                # ダッシュボード用のフォーマットに変換
                user_reservation = {
                    "reservation_id": reservation["reservation_id"],
                    "book_id": book_id,
                    "book_title": book["title"],
                    "book_image": book["cover_image"],
                    "reserved_at": reservation["reserved_at"],
                    "status": reservation["status"]
                }
                user_reservations.append(user_reservation)
    
    logger.info(f"ユーザーID {user_id} の予約数: {len(user_reservations)}")
    return user_reservations

@app.get("/api/purchase-requests/user/{user_id}")
def get_user_purchase_requests(user_id: int):
    logger.info(f"ユーザーID {user_id} の購入リクエスト一覧を取得")
    
    # このユーザーに関連する購入リクエストを集める
    user_requests = [req for req in PURCHASE_REQUESTS if req["user_id"] == user_id]
    
    logger.info(f"ユーザーID {user_id} の購入リクエスト数: {len(user_requests)}")
    return user_requests

@app.get("/api/purchase-requests/pending")
def get_pending_purchase_requests():
    logger.info("保留中の購入リクエスト一覧を取得")
    
    pending_requests = [req for req in PURCHASE_REQUESTS if req["status"] == "pending"]
    
    logger.info(f"保留中の購入リクエスト数: {len(pending_requests)}")
    return pending_requests

@app.post("/api/purchase-requests")
def create_purchase_request(request_data: dict):
    logger.info(f"購入リクエスト作成: {request_data}")
    
    # 新しいリクエストIDを生成
    new_id = max([req["id"] for req in PURCHASE_REQUESTS], default=0) + 1
    
    new_request = {
        "id": new_id,
        "user_id": request_data["user_id"],
        "title": request_data.get("title", ""),
        "author": request_data.get("author", ""),
        "amazon_url": request_data.get("amazon_url", ""),
        "reason": request_data.get("reason", ""),
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "price": request_data.get("price"),
        "publisher": request_data.get("publisher", ""),
        "isbn": request_data.get("isbn", ""),
        "cover_image": request_data.get("cover_image", "")
    }
    
    PURCHASE_REQUESTS.append(new_request)
    
    logger.info(f"購入リクエストが作成されました: ID={new_id}")
    return new_request

# Amazon書籍情報取得API
@app.get("/api/amazon/info")
def get_amazon_book_info(url: str):
    logger.info(f"Amazon書籍情報取得リクエスト: url={url}")
    
    # 実際の実装では、AmazonのURLからスクレイピングを行いますが、
    # ここではモックデータを返します
    
    # URLからISBNを抽出する仮実装
    import re
    isbn_match = re.search(r'dp/(\w+)', url)
    asin = isbn_match.group(1) if isbn_match else "B0B4R9DDYK"
    
    mock_data = {
        "title": "プログラミング言語の作り方",
        "author": "佐藤 淳一",
        "publisher": "技術評論社",
        "isbn": f"978-{asin}",
        "price": 3200,
        "description": "プログラミング言語の内部構造と実装方法について解説する本。",
        "cover_image": "/images/book-placeholder.png",
        "url": url
    }
    
    logger.info(f"Amazon書籍情報取得結果: {mock_data}")
    return mock_data

# 統計API
@app.get("/api/stats/dashboard")
def get_dashboard_stats():
    logger.info("ダッシュボード統計取得リクエスト")
    
    # 蔵書総数
    total_books = len(BOOKS)
    
    # 利用可能な書籍数
    available_books = len([book for book in BOOKS if book["is_available"]])
    
    # 返却期限切れの書籍数（現在の貸出から計算）
    # タイムゾーンを考慮した現在時刻を取得
    from datetime import timezone
    current_date = datetime.now(timezone.utc)
    overdue_books = 0
    
    for loan in LOANS:
        if loan["returned_at"] is None:  # 未返却の貸出
            try:
                # 貸出日から2週間後を返却期限とする
                borrowed_date = datetime.fromisoformat(loan["borrowed_at"].replace('Z', '+00:00'))
                due_date = borrowed_date + timedelta(days=14)
                if current_date > due_date:
                    overdue_books += 1
            except Exception as e:
                logger.warning(f"日時解析エラー: {loan['borrowed_at']}, エラー: {e}")
                continue
    
    # 承認待ちの購入申請数
    pending_requests = len([req for req in PURCHASE_REQUESTS if req["status"] == "pending"])
    
    stats = {
        "total_books": total_books,
        "available_books": available_books,
        "overdue_books": overdue_books,
        "pending_requests": pending_requests
    }
    
    logger.info(f"ダッシュボード統計: {stats}")
    return stats

@app.get("/api/stats/debug/book-status")
def get_debug_book_status():
    logger.info("デバッグ用書籍ステータス取得リクエスト")
    
    debug_data = []
    for book in BOOKS:
        # この書籍の現在の貸出状況を確認
        current_loan = None
        for loan in LOANS:
            if loan["book_id"] == book["id"] and loan["returned_at"] is None:
                current_loan = loan
                break
        
        # この書籍の予約状況を確認
        reservations = [res for res in RESERVATIONS if res["book_id"] == book["id"] and res["status"] == "active"]
        
        debug_info = {
            "book_id": book["id"],
            "title": book["title"],
            "is_available": book["is_available"],
            "current_borrower_id": book.get("current_borrower_id"),
            "current_loan": current_loan,
            "reservations_count": len(reservations)
        }
        debug_data.append(debug_info)
    
    logger.info(f"デバッグ用書籍ステータス数: {len(debug_data)}")
    return debug_data

# ISBN検索API
@app.get("/api/books/search/isbn/{isbn}")
def search_book_by_isbn(isbn: str):
    logger.info(f"ISBN検索リクエスト: isbn={isbn}")
    
    # 実際の実装では、外部APIを利用して書籍情報を取得します
    # ここではモックデータを返します
    
    mock_data = {
        "source": "openbd",
        "book_data": {
            "title": f"ISBN:{isbn}の書籍",
            "author": "著者名",
            "publisher": "出版社名",
            "isbn": isbn,
            "publication_date": "2023-01-01",
            "category": "プログラミング",
            "description": "書籍の説明文がここに入ります。",
            "cover_image": "/images/book-placeholder.png"
        }
    }
    
    logger.info(f"ISBN検索結果: {mock_data}")
    return mock_data

# 書籍インポートAPI
@app.post("/api/books/import/json")
def import_book(book_data: dict):
    logger.info(f"書籍インポートリクエスト: {book_data}")
    
    # 新しい書籍IDを生成
    new_id = max([book["id"] for book in BOOKS]) + 1
    
    new_book = {
        "id": new_id,
        "title": book_data["title"],
        "author": book_data["author"],
        "publisher": book_data.get("publisher", ""),
        "isbn": book_data.get("isbn", ""),
        "publication_date": book_data.get("publication_date", ""),
        "category": book_data.get("category", "その他"),
        "description": book_data.get("description", ""),
        "cover_image": book_data.get("cover_image", "/images/book-placeholder.png"),
        "is_available": True,
        "current_borrower_id": None,
        "added_at": datetime.now().isoformat(),
        "location": book_data.get("location", ""),
        "tags": book_data.get("tags", [])
    }
    
    BOOKS.append(new_book)
    
    logger.info(f"書籍がインポートされました: ID={new_id}, タイトル={new_book['title']}")
    return new_book

# 貸出・返却API
@app.post("/api/loans/return")
def return_book(data: dict):
    logger.info(f"書籍返却リクエスト: {data}")
    
    loan_id = data.get("loan_id")
    
    # 該当する貸出を検索
    for loan in LOANS:
        if loan["id"] == loan_id:
            # まだ返却されていない場合のみ
            if loan["returned_at"] is None:
                loan["returned_at"] = datetime.now().isoformat()
                
                # 書籍を利用可能状態に更新
                book_id = loan["book_id"]
                for book in BOOKS:
                    if book["id"] == book_id:
                        book["is_available"] = True
                        book["current_borrower_id"] = None
                
                logger.info(f"書籍が返却されました: loan_id={loan_id}, book_id={book_id}")
                return {"message": "正常に返却されました", "loan_id": loan_id}
    
    logger.error(f"該当する貸出が見つかりません: loan_id={loan_id}")
    raise HTTPException(status_code=404, detail="該当する貸出が見つかりません")

if __name__ == "__main__":
    logger.info("メインAPIサーバーを起動します...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 