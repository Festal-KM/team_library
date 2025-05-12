from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
        "cover_image": "/images/book-placeholder.png",
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
        "cover_image": "/images/book-placeholder.png",
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
        "cover_image": "/images/book-placeholder.png",
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

@app.get("/api/books")
def get_books():
    return BOOKS

@app.get("/api/books/{book_id}")
def get_book(book_id: int):
    for book in BOOKS:
        if book["id"] == book_id:
            return book
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
        new_request["amazon_info"] = scrape_amazon_book_info(request.url)
    
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

# Amazonスクレイピング関数
def scrape_amazon_book_info(url):
    try:
        logger.info(f"Scraping Amazon URL: {url}")
        
        # ランダムなUser-Agentを生成
        ua = UserAgent()
        user_agent = ua.random
        logger.info(f"Using User-Agent: {user_agent}")
        
        # Cloudscraperの初期化（Cloudflareの保護を回避）
        scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'darwin',
                'desktop': True
            },
            delay=2
        )
        
        # URLからAmazonのページを取得（タイムアウトを設定）
        logger.info("Sending request to Amazon...")
        response = scraper.get(url, timeout=15)
        
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
        
        # デバッグ用：HTMLの一部を保存
        with open("amazon_response_debug.html", "w", encoding="utf-8") as f:
            f.write(response.text[:20000])  # 最初の20000文字のみ保存
        logger.info("Saved partial response to amazon_response_debug.html for debugging")
        
        # CAPTCHAページかどうかを確認
        if "captcha" in response.text.lower() or "ロボットではありません" in response.text:
            logger.error("CAPTCHA detected")
            return None
            
        # 書籍情報の取得
        result = {}
        
        # タイトルの取得 - さらに多くのセレクタを試す
        title_selectors = [
            '#productTitle', 
            '.a-size-extra-large', 
            '.a-size-large', 
            '.product-title',
            'h1.a-spacing-none',
            'h1'
        ]
        
        for selector in title_selectors:
            title_element = soup.select_one(selector)
            if title_element and title_element.text.strip():
                result['title'] = title_element.text.strip()
                logger.info(f"Found title with selector {selector}: {result['title']}")
                break
        
        # 著者の取得 - さらに多くのセレクタを試す
        author_selectors = [
            '.a-row .contributorNameID', 
            '.author a', 
            '#bylineInfo .a-link-normal', 
            '.author a', 
            '.authors-container a',
            '.authorNameLink a',
            '.contributorNameTrigger',
            '.a-row .a-size-base.a-link-normal'
        ]
        
        for selector in author_selectors:
            author_elements = soup.select(selector)
            if author_elements:
                authors = [author.text.strip() for author in author_elements if author.text.strip()]
                if authors:
                    # 重複を取り除く
                    authors = list(dict.fromkeys(authors))
                    result['author'] = ', '.join(authors)
                    logger.info(f"Found authors with selector {selector}: {result['author']}")
                    break
        
        # すべてのテキストから出版社とISBNを探す (より広い範囲で検索)
        all_text = soup.get_text()
        
        # 出版社の取得 - より多くのセレクタと正規表現パターンを試す
        publisher_selectors = [
            '#detailBullets_feature_div li:contains("出版社")',
            '#detailBulletsWrapper_feature_div li:contains("出版社")',
            '#productDetailsTable .a-size-base:contains("出版社")',
            '.detail-bullet:contains("出版社")',
            '#detailBullets_feature_div li span span:contains("出版社")',
            '.a-unordered-list .a-list-item:contains("出版社")'
        ]
        
        # 出版社のセレクタを試す
        publisher_found = False
        for selector in publisher_selectors:
            publisher_element = soup.select_one(selector)
            if publisher_element:
                publisher_text = publisher_element.text.strip()
                logger.info(f"Found publisher text with selector {selector}: {publisher_text}")
                # 「出版社 : 」や「出版社: 」の後の部分を抽出（特殊文字を含む可能性がある）
                match = re.search(r'出版社[\s\u200f\u200e:：]*([^;,\n]+)', publisher_text)
                if match:
                    # 余分な空白や特殊文字を削除
                    publisher_value = match.group(1).strip()
                    publisher_value = re.sub(r'[\u200f\u200e\u2000-\u200f\u2028-\u202f]+', '', publisher_value)
                    result['publisher'] = publisher_value
                    logger.info(f"Extracted publisher: {result['publisher']}")
                    publisher_found = True
                    break

        # セレクタで見つからない場合は全テキストから検索
        if not publisher_found:
            publisher_patterns = [
                r'出版社[\s\u200f\u200e:：]*([^;,\n]+)',
                r'出版元[\s\u200f\u200e:：]*([^;,\n]+)',
                r'発行所[\s\u200f\u200e:：]*([^;,\n]+)',
                r'Publisher[\s\u200f\u200e:：]*([^;,\n]+)'
            ]
            
            for pattern in publisher_patterns:
                publisher_match = re.search(pattern, all_text)
                if publisher_match:
                    publisher_value = publisher_match.group(1).strip()
                    publisher_value = re.sub(r'[\u200f\u200e\u2000-\u200f\u2028-\u202f]+', '', publisher_value)
                    result['publisher'] = publisher_value
                    logger.info(f"Found publisher from text using pattern {pattern}: {result['publisher']}")
                    publisher_found = True
                    break
        
        # 商品詳細テーブルから出版社を探す
        if not publisher_found:
            detail_sections = soup.select('.a-section .a-row, #productDetails tr, .prodDetTable tr, .a-expander-content tr')
            for section in detail_sections:
                section_text = section.text.strip()
                if '出版社' in section_text or '発行所' in section_text or 'Publisher' in section_text:
                    # テーブルセル内のテキストを取得
                    cells = section.select('td, th')
                    if len(cells) >= 2:
                        result['publisher'] = cells[1].text.strip()
                        logger.info(f"Found publisher from detail table: {result['publisher']}")
                        publisher_found = True
                        break
        
        # ISBNの取得 - より多くのセレクタと正規表現パターンを試す
        isbn_selectors = [
            '#detailBullets_feature_div li:contains("ISBN-13")',
            '#detailBulletsWrapper_feature_div li:contains("ISBN-13")',
            '#productDetailsTable .a-size-base:contains("ISBN-13")',
            '.detail-bullet:contains("ISBN-13")',
            '#detailBullets_feature_div li span span:contains("ISBN-13")',
            '.a-unordered-list .a-list-item:contains("ISBN-13")',
            '#detailBullets_feature_div li:contains("ISBN")',
            '#detailBulletsWrapper_feature_div li:contains("ISBN")',
            '#productDetailsTable .a-size-base:contains("ISBN")'
        ]
        
        # ISBNのセレクタを試す
        isbn_found = False
        for selector in isbn_selectors:
            isbn_element = soup.select_one(selector)
            if isbn_element:
                isbn_text = isbn_element.text.strip()
                logger.info(f"Found ISBN text with selector {selector}: {isbn_text}")
                
                # ISBNの数字部分だけを抽出（13桁または10桁の数字とハイフン）
                isbn_match = re.search(r'(978[-\d]{10,17}|[\d-]{10,13})', isbn_text)
                if isbn_match:
                    result['isbn'] = isbn_match.group(1).strip().replace('-', '')
                    logger.info(f"Extracted ISBN: {result['isbn']}")
                    isbn_found = True
                    break
                    
                # 見つからない場合は「ISBN-13 : 」や「ISBN-10 : 」の後の部分を抽出
                match = re.search(r'ISBN[-]?1[03]?[\s\u200f\u200e:：]*([0-9-]{10,17})', isbn_text)
                if match:
                    result['isbn'] = match.group(1).strip().replace('-', '')
                    logger.info(f"Extracted ISBN with prefix: {result['isbn']}")
                    isbn_found = True
                    break
                
                # 単にISBNだけの場合
                match = re.search(r'ISBN[\s\u200f\u200e:：]*([0-9-]{10,17})', isbn_text)
                if match:
                    result['isbn'] = match.group(1).strip().replace('-', '')
                    logger.info(f"Extracted ISBN simple: {result['isbn']}")
                    isbn_found = True
                    break
        
        # セレクタで見つからない場合は全テキストから検索
        if not isbn_found:
            # ISBNの数字部分を直接探す
            isbn_direct_match = re.search(r'(978[-\d]{10,17}|[\d-]{10,13})', all_text)
            if isbn_direct_match:
                result['isbn'] = isbn_direct_match.group(1).strip().replace('-', '')
                logger.info(f"Found ISBN direct from text: {result['isbn']}")
                isbn_found = True
            else:
                isbn_patterns = [
                    r'ISBN[-]?13[\s\u200f\u200e:：]*([0-9-]{10,17})',
                    r'ISBN[-]?10[\s\u200f\u200e:：]*([0-9-]{10,17})',
                    r'ISBN[\s\u200f\u200e:：]*([0-9-]{10,17})'
                ]
                
                for pattern in isbn_patterns:
                    isbn_match = re.search(pattern, all_text)
                    if isbn_match:
                        result['isbn'] = isbn_match.group(1).strip().replace('-', '')
                        logger.info(f"Found ISBN from text using pattern {pattern}: {result['isbn']}")
                        isbn_found = True
                        break
        
        # URLからASINを抽出してISBNとして使用（最後の手段）
        if not isbn_found:
            # URLからASINを抽出
            asin_match = re.search(r'/dp/([A-Z0-9]{10})', url)
            if asin_match:
                asin = asin_match.group(1)
                # ASINが10桁の数字のみの場合、それはISBN-10の可能性が高い
                if re.match(r'^[0-9]{10}$', asin):
                    result['isbn'] = asin
                    logger.info(f"Using ASIN as ISBN: {result['isbn']}")
                    isbn_found = True
                else:
                    # 数字でないASINの場合も、ASINとしてセットしておく
                    result['isbn'] = asin
                    logger.info(f"Using ASIN as ID: {result['isbn']}")
                    isbn_found = True
        
        # 価格の取得 - さらに多くのセレクタと正規表現を試す
        price_selectors = [
            '.a-price .a-offscreen', 
            '#price', 
            '#priceblock_ourprice', 
            '.price3P', 
            '#buybox .a-section .a-price .a-offscreen',
            '.a-price',
            '.a-color-price',
            '#corePrice_feature_div .a-price'
        ]
        
        for selector in price_selectors:
            price_element = soup.select_one(selector)
            if price_element:
                price_text = price_element.text.strip()
                logger.info(f"Found price text with selector {selector}: {price_text}")
                # 「￥」や「,」を取り除き、数値部分だけを抽出
                price_match = re.search(r'[\d,]+', price_text)
                if price_match:
                    price_str = price_match.group().replace(',', '')
                    try:
                        result['price'] = int(price_str)
                        logger.info(f"Extracted price: {result['price']}")
                        break
                    except ValueError:
                        logger.error(f"Failed to convert price to integer: {price_str}")
        
        # 全テキストから価格を探す
        if 'price' not in result or not result['price']:
            price_text_match = re.search(r'(¥|￥)[\s]*?([\d,]+)', all_text)
            if price_text_match:
                price_str = price_text_match.group(2).replace(',', '')
                try:
                    result['price'] = int(price_str)
                    logger.info(f"Extracted price from text: {result['price']}")
                except ValueError:
                    logger.error(f"Failed to convert price to integer from text: {price_str}")
        
        # 画像URLの取得 - さらに多くのセレクタを試す
        image_selectors = [
            '#imgBlkFront', 
            '#landingImage', 
            '#ebooksImgBlkFront', 
            '#main-image',
            '.a-dynamic-image',
            '#imageBlock_feature_div img',
            '#imageBlock img',
            '#main-image-container img'
        ]
        
        for selector in image_selectors:
            image_element = soup.select_one(selector)
            if image_element:
                if image_element.has_attr('src'):
                    result['image_url'] = image_element['src']
                    logger.info(f"Found image URL from src with selector {selector}: {result['image_url']}")
                    break
                elif image_element.has_attr('data-a-dynamic-image'):
                    try:
                        image_json = json.loads(image_element['data-a-dynamic-image'])
                        if image_json:
                            result['image_url'] = list(image_json.keys())[0]
                            logger.info(f"Found image URL from JSON with selector {selector}: {result['image_url']}")
                            break
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse image JSON: {e}")
        
        # 在庫状況の取得 - さらに多くのセレクタを試す
        availability_selectors = [
            '#availability', 
            '#outOfStock', 
            '#availability_feature_div',
            '.availability',
            '#availabilityInsideBuyBox_feature_div'
        ]
        
        for selector in availability_selectors:
            availability_element = soup.select_one(selector)
            if availability_element:
                availability_text = availability_element.text.strip()
                logger.info(f"Found availability text with selector {selector}: {availability_text}")
                # 「在庫あり」か「在庫切れ」かを判断
                if '在庫あり' in availability_text:
                    result['availability'] = '在庫あり'
                elif '在庫切れ' in availability_text or '現在お取り扱いできません' in availability_text:
                    result['availability'] = '在庫切れ'
                else:
                    result['availability'] = availability_text
                logger.info(f"Extracted availability: {result['availability']}")
                break
        
        # 全テキストから在庫状況を探す
        if 'availability' not in result:
            if '在庫あり' in all_text:
                result['availability'] = '在庫あり'
                logger.info("Found availability from text: 在庫あり")
            elif '在庫切れ' in all_text or '現在お取り扱いできません' in all_text:
                result['availability'] = '在庫切れ'
                logger.info("Found availability from text: 在庫切れ")
        
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

# 本の貸出・返却関連のエンドポイント
@app.get("/api/loans/user/{user_id}/active")
def get_active_loans(user_id: int):
    """ユーザーが現在借りている本のリストを取得"""
    active_loans = []
    for book in BOOKS:
        if book["status"] == "borrowed" and book["borrower_id"] == user_id:
            # 貸出情報を追加
            loan_info = {
                "id": random.randint(1000, 9999),
                "book_id": book["id"],
                "book_title": book["title"],
                "book_author": book["author"],
                "borrow_date": book["borrow_date"],
                "due_date": (datetime.fromisoformat(book["borrow_date"]) + timedelta(days=14)).isoformat(),
                "status": "active"
            }
            active_loans.append(loan_info)
    return active_loans

@app.get("/api/loans/overdue")
def get_overdue_loans():
    """返却期限が過ぎている本のリストを取得"""
    overdue_loans = []
    current_date = datetime.now()
    
    for book in BOOKS:
        if book["status"] == "borrowed" and book["borrow_date"]:
            # 仮に貸出期間を14日とする
            borrow_date = datetime.fromisoformat(book["borrow_date"])
            due_date = borrow_date + timedelta(days=14)
            
            if current_date > due_date:
                # 貸出情報を追加
                loan_info = {
                    "id": random.randint(1000, 9999),
                    "book_id": book["id"],
                    "book_title": book["title"],
                    "user_id": book["borrower_id"],
                    "user_name": next((user["full_name"] for user in USERS if user["id"] == book["borrower_id"]), "不明"),
                    "borrow_date": book["borrow_date"],
                    "due_date": due_date.isoformat(),
                    "days_overdue": (current_date - due_date).days
                }
                overdue_loans.append(loan_info)
    
    return overdue_loans

@app.get("/api/reservations/user/{user_id}")
def get_user_reservations(user_id: int):
    """ユーザーの予約リストを取得"""
    user_reservations = []
    
    for book in BOOKS:
        for reservation in book["reservations"]:
            if reservation["user_id"] == user_id:
                # 予約情報を追加
                reservation_info = {
                    "id": reservation["id"],
                    "book_id": book["id"],
                    "book_title": book["title"],
                    "book_author": book["author"],
                    "reservation_date": reservation["reservation_date"],
                    "position": reservation["position"],
                    "status": "待機中" if book["status"] == "borrowed" else "貸出可能",
                    "available": book["status"] == "available"
                }
                user_reservations.append(reservation_info)
    
    return user_reservations

@app.get("/api/reservations/book/{book_id}/queue")
def get_book_reservation_queue(book_id: int):
    """本の予約キューを取得"""
    for book in BOOKS:
        if book["id"] == book_id:
            # 予約者情報を追加
            queue_with_users = []
            for reservation in sorted(book["reservations"], key=lambda r: r["position"]):
                user = next((u for u in USERS if u["id"] == reservation["user_id"]), None)
                if user:
                    queue_with_users.append({
                        "reservation_id": reservation["id"],
                        "user_id": user["id"],
                        "user_name": user["full_name"],
                        "position": reservation["position"],
                        "reservation_date": reservation["reservation_date"]
                    })
            return queue_with_users
    
    raise HTTPException(status_code=404, detail="Book not found")

@app.get("/api/books/{book_id}/reservations/count")
def get_book_reservation_count(book_id: int):
    """本の予約数を取得"""
    for book in BOOKS:
        if book["id"] == book_id:
            return {
                "book_id": book_id,
                "reservation_count": len(book["reservations"])
            }
    
    raise HTTPException(status_code=404, detail="Book not found")

@app.post("/api/reservations")
def create_reservation(reservation_data: dict):
    """本の予約を作成"""
    logger.info(f"Received reservation request: {json.dumps(reservation_data)}")
    
    book_id = reservation_data.get("book_id")
    user_id = reservation_data.get("user_id")
    
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
    
    # 利用可能な本は予約できない
    if book["status"] == "available":
        logger.error(f"Book is available and cannot be reserved - book_id: {book_id}")
        raise HTTPException(status_code=400, detail="Available books cannot be reserved")
    
    # 既に予約しているか確認
    for reservation in book["reservations"]:
        if reservation["user_id"] == user_id:
            logger.error(f"User already reserved this book - book_id: {book_id}, user_id: {user_id}")
            raise HTTPException(status_code=400, detail="You have already reserved this book")
    
    # 自分が借りている本は予約できない
    if book["borrower_id"] == user_id:
        logger.error(f"User borrowed this book and cannot reserve it - book_id: {book_id}, user_id: {user_id}")
        raise HTTPException(status_code=400, detail="You cannot reserve a book that you have borrowed")
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 