from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import time
from datetime import datetime, timedelta
import random
from typing import List, Optional
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re
from fake_useragent import UserAgent
import logging

# ロギング設定
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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

class BookImport(BaseModel):
    title: str
    author: str
    publisher: Optional[str] = None
    isbn: Optional[str] = None
    publication_date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = None
    donated_by: Optional[int] = None
    donation_note: Optional[str] = None

app = FastAPI(title="蔵書管理システム API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境では全てのオリジンを許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# サンプルデータ
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
        "status": "available",
        "borrower_id": None,
        "borrow_date": None,
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
        "status": "available",
        "borrower_id": None,
        "borrow_date": None,
        "return_date": None,
        "location": "技術書棚B-1",
        "tags": ["アーキテクチャ", "設計", "SOLID原則"],
        "rating": 4.6,
        "reservations": []
    }
]

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

@app.get("/api/books")
def get_books():
    # 各書籍にis_availableプロパティを追加
    books_with_availability = []
    for book in BOOKS:
        books_with_availability.append(format_book_for_frontend(book))
    logger.debug(f"Returning {len(books_with_availability)} books")
    return books_with_availability

@app.get("/api/books/{book_id}")
def get_book(book_id: int):
    for book in BOOKS:
        if book["id"] == book_id:
            return format_book_for_frontend(book)
    raise HTTPException(status_code=404, detail="Book not found")

@app.post("/api/books/{book_id}/borrow")
def borrow_book(book_id: int, user_id: int):
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

@app.post("/api/books/{book_id}/reserve")
def reserve_book(book_id: int, user_id: int):
    for book in BOOKS:
        if book["id"] == book_id:
            if book["status"] == "borrowed" and book["borrower_id"] != user_id:
                # 既に予約している場合はエラー
                for reservation in book["reservations"]:
                    if reservation["user_id"] == user_id:
                        raise HTTPException(status_code=400, detail="You have already reserved this book")
                
                # 新しい予約を追加
                new_reservation = {
                    "id": random.randint(1000, 9999),
                    "user_id": user_id,
                    "reservation_date": datetime.now().isoformat(),
                    "position": len(book["reservations"]) + 1
                }
                book["reservations"].append(new_reservation)
                return {"message": "Book reserved successfully", "reservation": new_reservation}
            elif book["status"] == "available":
                raise HTTPException(status_code=400, detail="Book is available for borrowing")
            else:
                raise HTTPException(status_code=400, detail="Cannot reserve this book")
    raise HTTPException(status_code=404, detail="Book not found")

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

# 購入申請エンドポイントの追加
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
def approve_purchase_request(request_id: int, admin_id: int):
    for pr in PURCHASE_REQUESTS:
        if pr["id"] == request_id:
            if pr["status"] != "pending":
                raise HTTPException(status_code=400, detail="This request is not in pending status")
            
            pr["status"] = "approved"
            pr["approved_by"] = admin_id
            pr["approved_at"] = datetime.now().isoformat()
            pr["updated_at"] = datetime.now().isoformat()
            
            return pr
    
    raise HTTPException(status_code=404, detail="Purchase request not found")

@app.put("/api/purchase-requests/{request_id}/reject")
def reject_purchase_request(request_id: int, admin_id: int):
    for pr in PURCHASE_REQUESTS:
        if pr["id"] == request_id:
            if pr["status"] != "pending":
                raise HTTPException(status_code=400, detail="This request is not in pending status")
            
            pr["status"] = "rejected"
            pr["approved_by"] = admin_id  # 実際はapprover_idなどの方が適切
            pr["updated_at"] = datetime.now().isoformat()
            
            return pr
    
    raise HTTPException(status_code=404, detail="Purchase request not found")

# Amazonスクレイピング関数
def scrape_amazon_book_info(url):
    try:
        logger.info(f"Scraping Amazon URL: {url}")
        
        # ランダムなUser-Agentを生成
        ua = UserAgent()
        user_agent = ua.random
        logger.info(f"Using User-Agent: {user_agent}")
        
        # ヘッダー情報を設定して、ブラウザからのアクセスに見せかける
        headers = {
            'User-Agent': user_agent,
            'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Referer': 'https://www.amazon.co.jp/',
            'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
            'dnt': '1'
        }
        
        # URLからAmazonのページを取得（タイムアウトを設定）
        logger.info("Sending request to Amazon...")
        response = requests.get(url, headers=headers, timeout=10)
        
        # ステータスコードを確認
        logger.info(f"Response status code: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"Error: Status code {response.status_code}")
            return None
        
        # レスポンスの長さをチェック
        logger.info(f"Response content length: {len(response.text)} bytes")
        if len(response.text) < 1000:  # 短すぎるレスポンスはCAPTCHAの可能性
            logger.error("Response too short, might be blocked or CAPTCHA")
            with open("amazon_response.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            logger.info("Saved response to amazon_response.html")
            return None
            
        # BeautifulSoupでHTMLを解析
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # CAPTCHAページかどうかを確認
        if "captcha" in response.text.lower() or "ロボットではありません" in response.text:
            logger.error("CAPTCHA detected")
            return None
            
        # 書籍情報の取得
        result = {}
        
        # タイトルの取得
        title_element = soup.select_one('#productTitle')
        if title_element:
            result['title'] = title_element.text.strip()
            logger.info(f"Found title: {result['title']}")
        else:
            # 別の方法でタイトルを探す
            title_element = soup.select_one('.a-size-extra-large')
            if title_element:
                result['title'] = title_element.text.strip()
                logger.info(f"Found title (alternative): {result['title']}")
            else:
                logger.warning("Title element not found")
        
        # 著者の取得
        author_elements = soup.select('.a-row .contributorNameID, .author a, #bylineInfo .a-link-normal, .author a, .authors-container a, .authorNameLink a')
        if author_elements:
            authors = [author.text.strip() for author in author_elements if author.text.strip()]
            # 重複を取り除く
            authors = list(dict.fromkeys(authors))
            result['author'] = ', '.join(authors)
            logger.info(f"Found authors: {result['author']}")
        else:
            logger.warning("Author elements not found")
        
        # 出版社の取得
        publisher_element = soup.select_one('#detailBullets_feature_div li:contains("出版社"), #detailBulletsWrapper_feature_div li:contains("出版社"), #productDetailsTable .a-size-base:contains("出版社")')
        if publisher_element:
            publisher_text = publisher_element.text.strip()
            logger.info(f"Found publisher text: {publisher_text}")
            # 「出版社 : 」の後の部分を抽出
            match = re.search(r'出版社\s*:\s*([^;]+)', publisher_text)
            if match:
                result['publisher'] = match.group(1).strip()
                logger.info(f"Extracted publisher: {result['publisher']}")
        else:
            logger.warning("Publisher element not found")
        
        # ISBNの取得
        isbn_element = soup.select_one('#detailBullets_feature_div li:contains("ISBN-13"), #detailBulletsWrapper_feature_div li:contains("ISBN-13"), #productDetailsTable .a-size-base:contains("ISBN-13")')
        if isbn_element:
            isbn_text = isbn_element.text.strip()
            logger.info(f"Found ISBN text: {isbn_text}")
            # 「ISBN-13 : 」の後の部分を抽出
            match = re.search(r'ISBN-13\s*:\s*([0-9-]+)', isbn_text)
            if match:
                result['isbn'] = match.group(1).strip().replace('-', '')
                logger.info(f"Extracted ISBN: {result['isbn']}")
        else:
            logger.warning("ISBN element not found")
        
        # 価格の取得
        price_element = soup.select_one('.a-price .a-offscreen, #price, #priceblock_ourprice, .price3P, #buybox .a-section .a-price .a-offscreen')
        if price_element:
            price_text = price_element.text.strip()
            logger.info(f"Found price text: {price_text}")
            # 「￥」や「,」を取り除き、数値部分だけを抽出
            price_match = re.search(r'[\d,]+', price_text)
            if price_match:
                price_str = price_match.group().replace(',', '')
                try:
                    result['price'] = int(price_str)
                    logger.info(f"Extracted price: {result['price']}")
                except ValueError:
                    logger.error(f"Failed to convert price to integer: {price_str}")
                    result['price'] = None
        else:
            logger.warning("Price element not found")
        
        # 画像URLの取得
        image_element = soup.select_one('#imgBlkFront, #landingImage, #ebooksImgBlkFront, #main-image')
        if image_element and image_element.has_attr('src'):
            result['image_url'] = image_element['src']
            logger.info(f"Found image URL from src: {result['image_url']}")
        elif image_element and image_element.has_attr('data-a-dynamic-image'):
            # JSON文字列から画像URLを抽出
            try:
                image_json = json.loads(image_element['data-a-dynamic-image'])
                if image_json:
                    # 最初のURLを使用
                    result['image_url'] = list(image_json.keys())[0]
                    logger.info(f"Found image URL from JSON: {result['image_url']}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse image JSON: {e}")
        else:
            logger.warning("Image element not found")
        
        # 在庫状況の取得
        availability_element = soup.select_one('#availability, #outOfStock, #availability_feature_div')
        if availability_element:
            availability_text = availability_element.text.strip()
            logger.info(f"Found availability text: {availability_text}")
            # 「在庫あり」か「在庫切れ」かを判断
            if '在庫あり' in availability_text:
                result['availability'] = '在庫あり'
            elif '在庫切れ' in availability_text or '現在お取り扱いできません' in availability_text:
                result['availability'] = '在庫切れ'
            else:
                result['availability'] = availability_text
            logger.info(f"Extracted availability: {result['availability']}")
        else:
            logger.warning("Availability element not found")
        
        # 結果がない場合のフォールバック値
        if 'title' not in result or not result['title']:
            logger.warning("Using fallback value for title")
            result['title'] = 'タイトル不明'
        
        if 'author' not in result or not result['author']:
            logger.warning("Using fallback value for author")
            result['author'] = '著者不明'
        
        if 'publisher' not in result or not result['publisher']:
            logger.warning("Using fallback value for publisher")
            result['publisher'] = '出版社不明'
        
        if 'isbn' not in result or not result['isbn']:
            logger.warning("Using fallback value for ISBN")
            result['isbn'] = ''
        
        if 'price' not in result or not result['price']:
            logger.warning("Using fallback value for price")
            result['price'] = 0
        
        if 'image_url' not in result or not result['image_url']:
            logger.warning("Using fallback value for image URL")
            result['image_url'] = 'https://via.placeholder.com/200x300?text=No+Image'
        
        if 'availability' not in result or not result['availability']:
            logger.warning("Using fallback value for availability")
            result['availability'] = '在庫状況不明'
        
        logger.info(f"Scraping results: {json.dumps(result, ensure_ascii=False)}")
        return result
        
    except Exception as e:
        logger.exception(f"Scraping error: {str(e)}")
        return None

# Amazon情報を取得するAPIエンドポイント
@app.get("/api/amazon/info")
def get_amazon_info(url: str):
    if not url or "amazon" not in url.lower():
        logger.error(f"Invalid Amazon URL: {url}")
        raise HTTPException(status_code=400, detail="Invalid Amazon URL")
    
    # Amazonから実際に情報を取得
    logger.info(f"Getting Amazon info for URL: {url}")
    amazon_info = scrape_amazon_book_info(url)
    
    if not amazon_info:
        logger.warning("Scraping failed, returning sample data")
        # スクレイピングに失敗した場合は基本的な情報のみ返す
        return {
            "title": "サンプル書籍",
            "author": "サンプル著者",
            "publisher": "サンプル出版社",
            "isbn": "9784XXXXXXXXXX",
            "price": random.randint(1500, 5000),
            "image_url": "https://via.placeholder.com/200x300?text=No+Image",
            "availability": "在庫情報取得失敗"
        }
    
    logger.info(f"Successfully retrieved Amazon info: {json.dumps(amazon_info, ensure_ascii=False)}")
    return amazon_info

# 書籍インポート関連のデバッグエンドポイント
@app.get("/api/debug/import-test")
async def debug_import():
    """インポートデバッグ用エンドポイント"""
    logger.info("インポートデバッグエンドポイントにアクセスされました")
    return {"status": "ok", "message": "インポートデバッグエンドポイントは正常に動作しています"}

# 書籍インポート（寄贈）エンドポイント - URLパスを明示的に設定
@app.post("/api/books/import")
async def import_book(book_data: BookImport):
    """新しい書籍をインポート（寄贈登録）する"""
    logger.info(f"書籍インポートリクエスト受信: {book_data.model_dump()}")
    
    # 新しい書籍IDを生成
    new_id = max([book["id"] for book in BOOKS]) + 1
    
    # 新しい書籍を作成
    new_book = {
        "id": new_id,
        "title": book_data.title,
        "author": book_data.author,
        "publisher": book_data.publisher,
        "isbn": book_data.isbn,
        "publication_date": book_data.publication_date or datetime.now().isoformat().split('T')[0],
        "category": book_data.category or "その他",
        "description": book_data.description or f"{book_data.title} - {book_data.author}による著書",
        "cover_image": book_data.cover_image or "/images/readable-code.jpg",  # デフォルト画像
        "status": "available",  # 初期状態は利用可能
        "borrower_id": None,
        "borrow_date": None,
        "return_date": None,
        "location": book_data.location or "寄贈書籍棚",
        "tags": book_data.tags or [],
        "rating": 0,  # 初期評価は0
        "reservations": [],
        "donated_by": book_data.donated_by,
        "donation_date": datetime.now().isoformat(),
        "donation_note": book_data.donation_note
    }
    
    # 書籍データベースに追加
    BOOKS.append(new_book)
    
    logger.info(f"新しい書籍をインポートしました: id={new_id}, タイトル={book_data.title}")
    
    # フロントエンド用の形式に変換
    return format_book_for_frontend(new_book)

# 代替の書籍インポートエンドポイント（JSONでの直接受け取り）
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
        return format_book_for_frontend(new_book)
    except Exception as e:
        logger.error(f"書籍インポート中にエラー発生: {str(e)}")
        # エラーをより詳細に返す
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"書籍のインポートに失敗しました: {str(e)}"
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 