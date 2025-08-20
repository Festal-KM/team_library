"""
書籍サービス層
"""
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func, case, String
import logging
from datetime import datetime

from src.models.book import Book, BookStatus
from src.models.user import UserRole
from src.schemas.book import BookCreate, BookUpdate, CategoryStructure
from src.config.categories import MAJOR_CATEGORIES, get_minor_categories, validate_category_structure

logger = logging.getLogger(__name__)

class BookService:
    """書籍関連のビジネスロジック"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_books(
        self,
        title: Optional[str] = None,
        author: Optional[str] = None,
        major_category: Optional[str] = None,
        minor_categories: Optional[List[str]] = None,
        available_only: bool = False,
        skip: int = 0,
        limit: int = 500
    ) -> List[Book]:
        """書籍一覧を取得"""
        from src.models.loan import Loan
        from src.models.user import User
        
        query = self.db.query(Book).outerjoin(
            Loan, 
            and_(Book.id == Loan.book_id, Loan.return_date == None)
        ).outerjoin(
            User,
            Loan.user_id == User.id
        )
        
        # 基本的なフィルタリング条件を構築
        filters = []
        
        if title:
            filters.append(Book.title.ilike(f"%{title}%"))
        
        if author:
            filters.append(Book.author.ilike(f"%{author}%"))
        
        if available_only:
            filters.append(Book.status == BookStatus.AVAILABLE)
        
        # 基本条件でクエリ実行
        if filters:
            query = query.filter(and_(*filters))
        
        # 最新順にソート（作成日時の降順）
        query = query.order_by(desc(Book.created_at))
        
        books = query.all()
        
        # カテゴリフィルタリングをPythonで実行
        if major_category or (minor_categories and len(minor_categories) > 0):
            logger.info(f"Starting category filtering: major_category={major_category}, minor_categories={minor_categories}")
            filtered_books = []
            for book in books:
                if book.category_structure:
                    # 大項目チェック
                    if major_category:
                        book_major = book.category_structure.get("major_category", "")
                        if book_major != major_category:
                            continue
                    
                    # 中項目チェック
                    if minor_categories and len(minor_categories) > 0:
                        book_minors = book.category_structure.get("minor_categories", [])
                        logger.debug(f"Book '{book.title}' has minors: {book_minors}, checking against: {minor_categories}")
                        # いずれかの中項目が一致すればOK
                        if not any(minor in book_minors for minor in minor_categories):
                            logger.debug(f"Book '{book.title}' filtered out - no matching minor categories")
                            continue
                        else:
                            logger.debug(f"Book '{book.title}' passed minor category filter")
                    
                    filtered_books.append(book)
            logger.info(f"Category filtering result: {len(filtered_books)} books from {len(books)} total")
            books = filtered_books
        
        # ページネーション
        total_books = len(books)
        books = books[skip:skip + limit]
        
        # 借用者情報を設定
        for book in books:
            print(f"🔍 Book ID:{book.id} '{book.title[:30]}' - is_available: {book.is_available}, status: {book.status}")
            if not book.is_available:
                print(f"   📋 貸出中書籍として処理中...")
                # アクティブな貸出を取得
                active_loan = self.db.query(Loan).filter(
                    Loan.book_id == book.id,
                    Loan.return_date == None
                ).first()
                
                if active_loan:
                    print(f"   ✅ アクティブな貸出見つかりました: LoanID={active_loan.id}, UserID={active_loan.user_id}")
                    borrower = self.db.query(User).filter(User.id == active_loan.user_id).first()
                    if borrower:
                        # 動的に属性を追加
                        book.current_borrower_id = borrower.id
                        book.current_borrower_name = borrower.full_name
                        print(f"   ✅ 借り手情報設定完了: {borrower.full_name} (ID: {borrower.id})")
                    else:
                        print(f"   ❌ ユーザーID {active_loan.user_id} が見つかりません")
                else:
                    print(f"   ❌ アクティブな貸出記録が見つかりません")
            else:
                print(f"   ℹ️  利用可能書籍のためスキップ")
        
        return books
    
    def get_book_by_id(self, book_id: int) -> Optional[Book]:
        """IDで書籍を取得"""
        book = self.db.query(Book).filter(Book.id == book_id).first()
        
        if book and not book.is_available:
            # アクティブな貸出を取得して借り手情報を設定
            from src.models.loan import Loan
            from src.models.user import User
            
            active_loan = self.db.query(Loan).filter(
                Loan.book_id == book.id,
                Loan.return_date == None
            ).first()
            
            if active_loan:
                borrower = self.db.query(User).filter(User.id == active_loan.user_id).first()
                if borrower:
                    # 動的に属性を追加
                    book.current_borrower_id = borrower.id
                    book.current_borrower_name = borrower.full_name
        
        return book
    
    def get_book_by_isbn(self, isbn: str) -> Optional[Book]:
        """ISBNで書籍を取得"""
        return self.db.query(Book).filter(Book.isbn == isbn).first()
    
    def search_books(
        self,
        title: Optional[str] = None,
        author: Optional[str] = None,
        isbn: Optional[str] = None,
        publisher: Optional[str] = None,
        categories: Optional[List[str]] = None,  # 旧形式
        major_category: Optional[str] = None,    # 新形式：大項目
        minor_categories: Optional[List[str]] = None,  # 新形式：中項目
        status: Optional[BookStatus] = None,
        available_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Book]:
        """書籍検索（階層カテゴリ対応）"""
        query = self.db.query(Book)
        
        # 基本検索条件
        if title:
            query = query.filter(Book.title.ilike(f"%{title}%"))
        if author:
            query = query.filter(Book.author.ilike(f"%{author}%"))
        if isbn:
            query = query.filter(Book.isbn == isbn)
        if publisher:
            query = query.filter(Book.publisher.ilike(f"%{publisher}%"))
        if status:
            query = query.filter(Book.status == status)
        if available_only:
            query = query.filter(
                and_(
                    Book.status == BookStatus.AVAILABLE,
                    Book.available_copies > 0
                )
            )
        
        # カテゴリフィルター（新形式：階層カテゴリ）
        # SQLでの検索は複雑なので、基本検索後にPythonで後処理
        
        # カテゴリフィルター（旧形式：後方互換性）
        if categories:
            category_conditions = []
            for category in categories:
                category_conditions.append(
                    func.json_contains(Book.categories, f'"{category}"')
                )
            if category_conditions:
                query = query.filter(or_(*category_conditions))
        
        # ソート・ページネーション
        query = query.order_by(desc(Book.updated_at))
        query = query.offset(offset).limit(limit)
        
        books = query.all()
        
        # 階層カテゴリフィルタリングをPythonで実行
        if major_category or (minor_categories and len(minor_categories) > 0):
            filtered_books = []
            for book in books:
                if book.category_structure:
                    # 大項目チェック
                    if major_category:
                        book_major = book.category_structure.get("major_category", "")
                        if book_major != major_category:
                            continue
                    
                    # 中項目チェック
                    if minor_categories and len(minor_categories) > 0:
                        book_minors = book.category_structure.get("minor_categories", [])
                        # いずれかの中項目が一致すればOK
                        if not any(minor in book_minors for minor in minor_categories):
                            continue
                    
                    filtered_books.append(book)
            books = filtered_books
        
        return books
    
    def create_book(self, book_data: Union[dict, BookCreate]) -> Book:
        """新しい書籍を作成"""
        # 辞書形式の場合はBookCreateに変換
        if isinstance(book_data, dict):
            # 辞書からBookCreateオブジェクトを作成
            try:
                # カテゴリ構造の設定
                category_structure = None
                if book_data.get("category_structure"):
                    category_structure = book_data["category_structure"]
                elif book_data.get("category"):
                    # 旧形式カテゴリから階層構造を推定
                    category = book_data["category"]
                    major_category = "技術書"
                    minor_categories = [category] if category != "技術書" else []
                    
                    from src.schemas.book import CategoryStructure
                    category_structure = CategoryStructure(
                        major_category=major_category,
                        minor_categories=minor_categories
                    )
                else:
                    from src.schemas.book import CategoryStructure
                    category_structure = CategoryStructure(
                        major_category="技術書",
                        minor_categories=[]
                    )
                
                book_create_data = BookCreate(
                    title=book_data.get("title", ""),
                    author=book_data.get("author", ""),
                    isbn=book_data.get("isbn"),
                    publisher=book_data.get("publisher"),
                    publication_date=book_data.get("publication_date"),
                    description=book_data.get("description"),
                    location=book_data.get("location", ""),
                    image_url=book_data.get("image_url"),
                    price=book_data.get("price"),
                    category_structure=category_structure,
                    categories=book_data.get("categories", [])
                )
                book_data = book_create_data
            except Exception as e:
                logger.error(f"辞書からBookCreateへの変換エラー: {e}")
                raise ValueError(f"書籍データの形式が正しくありません: {str(e)}")
        
        # ISBNの重複チェック（空文字列やNoneは除外）
        if book_data.isbn and book_data.isbn.strip():
            existing_book = self.db.query(Book).filter(Book.isbn == book_data.isbn.strip()).first()
            if existing_book:
                logger.warning(f"ISBN重複: {book_data.isbn} (既存書籍ID: {existing_book.id})")
                # 重複の場合は既存書籍の在庫を増やす
                existing_book.total_copies += 1
                existing_book.available_copies += 1
                self.db.commit()
                self.db.refresh(existing_book)
                return existing_book
        
        # 階層カテゴリ構造を設定
        if book_data.category_structure:
            category_structure = {
                "major_category": book_data.category_structure.major_category,
                "minor_categories": book_data.category_structure.minor_categories
            }
        else:
            # デフォルト値設定
            category_structure = {
                "major_category": "技術書",
                "minor_categories": []
            }
        
        # 後方互換性のため旧形式も設定
        if book_data.categories:
            categories = book_data.categories
        else:
            # 階層構造から旧形式を生成
            categories = []
        
        book = Book(
            title=book_data.title,
            author=book_data.author,
            isbn=book_data.isbn.strip() if book_data.isbn else None,
            publisher=book_data.publisher,
            publication_date=book_data.publication_date,
            description=book_data.description,
            location=book_data.location or "",  # 書架位置はブランク
            image_url=book_data.image_url,
            price=book_data.price,
            status=BookStatus.AVAILABLE,  # Enumを直接使用
            total_copies=1,
            available_copies=1,
            category_structure=category_structure,
            categories=categories
        )
        
        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        
        logger.info(f"新規書籍作成: {book.title} (ID: {book.id})")
        return book
    
    def update_book(self, book_id: int, book_data: Union[dict, BookUpdate]) -> Optional[Book]:
        """書籍情報を更新"""
        book = self.db.query(Book).filter(Book.id == book_id).first()
        if not book:
            return None
        
        # update_dataがすでに辞書の場合はそのまま使用、BookUpdateオブジェクトの場合は変換
        if isinstance(book_data, dict):
            update_data = book_data
        else:
            update_data = book_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "category_structure" and value:
                # 階層カテゴリ構造の更新
                if isinstance(value, dict):
                    # 辞書形式の場合
                    book.category_structure = {
                        "major_category": value.get("major_category"),
                        "minor_categories": value.get("minor_categories", [])
                    }
                else:
                    # Pydanticモデル形式の場合
                    book.category_structure = {
                        "major_category": value.major_category,
                        "minor_categories": value.minor_categories
                    }
            elif field == "categories" and value is not None:
                # 旧形式カテゴリの更新
                book.categories = value
            elif hasattr(book, field):
                setattr(book, field, value)
        
        self.db.commit()
        self.db.refresh(book)
        
        logger.info(f"書籍更新: {book.title} (ID: {book.id})")
        return book
    
    def delete_book(self, book_id: int, force: bool = True) -> bool:
        """書籍を削除（関連データも含めて強制削除）"""
        logger.info(f"書籍削除開始: ID={book_id}, force={force}")
        
        book = self.get_book_by_id(book_id)
        if not book:
            logger.error(f"書籍が見つかりません: ID={book_id}")
            raise ValueError("書籍が見つかりません")
        
        logger.info(f"削除対象書籍: {book.title} (ID: {book_id})")
        
        try:
            # すべての関連データを削除（完全削除）
            from src.models.loan import Loan
            from src.models.reservation import Reservation
            
            # 1. この書籍のすべての貸出記録を削除
            all_loans = self.db.query(Loan).filter(Loan.book_id == book_id).all()
            for loan in all_loans:
                logger.info(f"貸出記録削除: ID={loan.id}, ユーザー={loan.user_id}")
                self.db.delete(loan)
            
            # 2. この書籍のすべての予約記録を削除
            all_reservations = self.db.query(Reservation).filter(Reservation.book_id == book_id).all()
            for reservation in all_reservations:
                logger.info(f"予約記録削除: ID={reservation.id}, ユーザー={reservation.user_id}")
                self.db.delete(reservation)
            
            # 3. 関連データの削除をコミット
            self.db.commit()
            logger.info(f"関連データ削除完了: 貸出{len(all_loans)}件, 予約{len(all_reservations)}件")
            
            # 4. 書籍本体を削除
            self.db.delete(book)
            self.db.commit()
            
            logger.info(f"書籍削除完了: {book.title} (ID: {book_id})")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"書籍削除エラー: {str(e)}")
            raise ValueError(f"書籍の削除中にエラーが発生しました: {str(e)}")
    
    def get_available_books(self, limit: int = 50, offset: int = 0) -> List[Book]:
        """利用可能な書籍一覧を取得"""
        return (
            self.db.query(Book)
            .filter(
                and_(
                    Book.status == BookStatus.AVAILABLE,
                    Book.available_copies > 0
                )
            )
            .order_by(desc(Book.updated_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    def get_books_by_category(self, category: str) -> List[Book]:
        """カテゴリ別書籍一覧を取得"""
        return self.db.query(Book).filter(Book.category == category).all()
    
    def get_popular_books(self, limit: int = 10) -> List[Book]:
        """人気書籍一覧を取得（貸出回数順）"""
        # 将来的に貸出履歴テーブルと結合して実装
        return self.db.query(Book).limit(limit).all()
    
    def check_isbn_exists(self, isbn: str, exclude_id: Optional[int] = None) -> bool:
        """ISBNの重複チェック"""
        # 空のISBNはチェックしない
        if not isbn or isbn.strip() == "":
            return False
            
        query = self.db.query(Book).filter(Book.isbn == isbn)
        if exclude_id:
            query = query.filter(Book.id != exclude_id)
        return query.first() is not None 
    
    def search_external_isbn(self, isbn: str) -> dict:
        """外部APIでISBN検索"""
        import requests
        import json
        import re
        from datetime import datetime
        
        # ISBNをクリーンアップ
        clean_isbn = isbn.replace('-', '').replace(' ', '')
        
        # 1. OpenBD APIで検索
        try:
            openbd_url = f"https://api.openbd.jp/v1/get?isbn={clean_isbn}"
            response = requests.get(openbd_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data and data[0] and data[0] is not None:
                    book_data = data[0]
                    summary = book_data.get('summary', {})
                    onix = book_data.get('onix', {})
                    
                    # OpenBDから情報を抽出
                    title = summary.get('title', '')
                    author = summary.get('author', '')
                    publisher = summary.get('publisher', '')
                    cover_image = summary.get('cover', '')
                    price = None
                    
                    # ONIXデータからより詳細な情報を取得
                    if onix:
                        descriptive_detail = onix.get('DescriptiveDetail', {})
                        if descriptive_detail:
                            # タイトル情報
                            title_detail = descriptive_detail.get('TitleDetail', {})
                            if isinstance(title_detail, list) and title_detail:
                                title_detail = title_detail[0]
                            title_elements = title_detail.get('TitleElement', {})
                            if isinstance(title_elements, list) and title_elements:
                                title_elements = title_elements[0]
                            if title_elements.get('TitleText'):
                                title_text = title_elements['TitleText']
                                if isinstance(title_text, dict):
                                    title = title_text.get('content', '')
                                else:
                                    title = title_text
                            
                            # 著者情報
                            contributors = descriptive_detail.get('Contributor', [])
                            if contributors and isinstance(contributors, list):
                                authors = []
                                for contributor in contributors:
                                    if isinstance(contributor, dict):
                                        person_name = contributor.get('PersonName', '')
                                        if isinstance(person_name, dict):
                                            # PersonNameが辞書の場合、contentフィールドを取得
                                            name = person_name.get('content', '')
                                            if name:
                                                authors.append(name)
                                        elif isinstance(person_name, str) and person_name:
                                            authors.append(person_name)
                                    elif isinstance(contributor, str):
                                        authors.append(contributor)
                                if authors:
                                    # 文字列のみを結合するように確認
                                    author = ', '.join(str(a) for a in authors if a)
                        
                        # 価格情報を取得
                        product_supply = onix.get('ProductSupply', {})
                        if product_supply:
                            supply_details = product_supply.get('SupplyDetail', [])
                            if isinstance(supply_details, list):
                                for supply_detail in supply_details:
                                    if isinstance(supply_detail, dict):
                                        prices = supply_detail.get('Price', [])
                                        if isinstance(prices, list):
                                            for price_info in prices:
                                                if isinstance(price_info, dict):
                                                    price_amount = price_info.get('PriceAmount')
                                                    if price_amount:
                                                        try:
                                                            price = float(price_amount)
                                                            break
                                                        except (ValueError, TypeError):
                                                            continue
                                        if price:
                                            break
                            elif isinstance(supply_details, dict):
                                prices = supply_details.get('Price', [])
                                if isinstance(prices, list):
                                    for price_info in prices:
                                        if isinstance(price_info, dict):
                                            price_amount = price_info.get('PriceAmount')
                                            if price_amount:
                                                try:
                                                    price = float(price_amount)
                                                    break
                                                except (ValueError, TypeError):
                                                    continue
                    
                    # OpenBDで表紙画像が見つからない場合、Google Books APIから取得
                    if not cover_image and title:
                        try:
                            google_url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{clean_isbn}"
                            google_response = requests.get(google_url, timeout=10)
                            
                            if google_response.status_code == 200:
                                google_data = google_response.json()
                                if google_data.get('totalItems', 0) > 0:
                                    google_book = google_data['items'][0]['volumeInfo']
                                    image_links = google_book.get('imageLinks', {})
                                    cover_image = image_links.get('thumbnail', image_links.get('smallThumbnail', ''))
                        except Exception as e:
                            logger.warning(f"Google Books API画像取得エラー: {e}")
                    
                    if title:  # タイトルがあれば成功とみなす
                        return {
                            "source": "openbd",
                            "book_data": {
                                "title": title,
                                "author": author,
                                "publisher": publisher,
                                "isbn": clean_isbn,
                                "publication_date": "",
                                "category": "書籍",
                                "description": f"OpenBDから取得した書籍情報",
                                "cover_image": cover_image,
                                "price": price
                            }
                        }
        except Exception as e:
            logger.warning(f"OpenBD API検索エラー: {e}")
        
        # 2. Google Books APIで検索
        try:
            google_url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{clean_isbn}"
            response = requests.get(google_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('totalItems', 0) > 0:
                    book = data['items'][0]['volumeInfo']
                    
                    # 著者情報の処理
                    authors = book.get('authors', [])
                    author = ', '.join(authors) if authors else ''
                    
                    # 出版日の処理
                    published_date = book.get('publishedDate', '')
                    
                    # カテゴリの処理
                    categories = book.get('categories', [])
                    category = categories[0] if categories else '書籍'
                    
                    # 画像URLの処理
                    image_links = book.get('imageLinks', {})
                    cover_image = image_links.get('thumbnail', image_links.get('smallThumbnail', ''))
                    
                    # Google Books APIには価格情報がないため、Amazonで検索を試行
                    price = None
                    try:
                        amazon_price = self._search_amazon_price(title, author)
                        if amazon_price:
                            price = amazon_price
                    except Exception as e:
                        logger.warning(f"Amazon価格検索エラー: {e}")
                    
                    return {
                        "source": "google_books",
                        "book_data": {
                            "title": book.get('title', ''),
                            "author": author,
                            "publisher": book.get('publisher', ''),
                            "isbn": clean_isbn,
                            "publication_date": published_date,
                            "category": category,
                            "description": book.get('description', ''),
                            "cover_image": cover_image,
                            "price": price
                        }
                    }
        except Exception as e:
            logger.warning(f"Google Books API検索エラー: {e}")
        
        # 3. 見つからない場合
        return {
            "source": "not_found",
            "book_data": {
                "title": "",
                "author": "",
                "publisher": "",
                "isbn": clean_isbn,
                "publication_date": "",
                "category": "",
                "description": "",
                "cover_image": "",
                "price": None
            }
        }
    
    def _search_amazon_price(self, title: str, author: str) -> Optional[float]:
        """Amazon検索で価格を取得（簡易実装）"""
        try:
            import requests
            from bs4 import BeautifulSoup
            import re
            import time
            
            # 検索クエリを作成
            query = f"{title} {author}".strip()
            if not query:
                return None
            
            # Amazon検索URL
            search_url = f"https://www.amazon.co.jp/s?k={query}&i=stripbooks"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            # リクエスト制限のため少し待機
            time.sleep(1)
            
            response = requests.get(search_url, headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # 価格要素を検索
                price_elements = soup.find_all(['span', 'div'], class_=re.compile(r'price|Price'))
                
                for element in price_elements:
                    text = element.get_text(strip=True)
                    # 日本円の価格パターンを検索
                    price_match = re.search(r'[￥¥]?(\d{1,3}(?:,\d{3})*)', text)
                    if price_match:
                        price_str = price_match.group(1).replace(',', '')
                        try:
                            price = float(price_str)
                            if 100 <= price <= 50000:  # 妥当な価格範囲
                                return price
                        except ValueError:
                            continue
            
            return None
            
        except Exception as e:
            logger.warning(f"Amazon価格検索エラー: {e}")
            return None 

    def get_books_by_category_structure(
        self,
        major_category: str,
        minor_categories: Optional[List[str]] = None
    ) -> List[Book]:
        """階層カテゴリ構造による書籍取得"""
        # 全書籍を取得してPythonで後処理
        books = self.db.query(Book).all()
        
        filtered_books = []
        for book in books:
            if book.category_structure:
                # 大項目チェック
                book_major = book.category_structure.get("major_category", "")
                if book_major != major_category:
                    continue
                
                # 中項目チェック（指定された場合）
                if minor_categories:
                    book_minors = book.category_structure.get("minor_categories", [])
                    # いずれかの中項目が一致すればOK
                    if not any(minor in book_minors for minor in minor_categories):
                        continue
                
                filtered_books.append(book)
        
        return sorted(filtered_books, key=lambda x: x.title)
    
    def get_category_statistics(self) -> Dict[str, Any]:
        """カテゴリ別統計情報を取得"""
        stats = {
            "major_category_stats": {},
            "minor_category_stats": {},
            "total_books": 0
        }
        
        # 全書籍を取得してカテゴリ統計を計算
        books = self.db.query(Book).all()
        stats["total_books"] = len(books)
        
        for book in books:
            if book.category_structure:
                major = book.category_structure.get("major_category", "不明")
                minors = book.category_structure.get("minor_categories", [])
                
                # 大項目統計
                stats["major_category_stats"][major] = stats["major_category_stats"].get(major, 0) + 1
                
                # 中項目統計
                for minor in minors:
                    key = f"{major}:{minor}"
                    stats["minor_category_stats"][key] = stats["minor_category_stats"].get(key, 0) + 1
        
        return stats
    
    def migrate_legacy_categories(self, book_id: int) -> Optional[Book]:
        """旧形式カテゴリを階層構造に移行"""
        book = self.db.query(Book).filter(Book.id == book_id).first()
        if not book or not book.categories:
            return book
        
        # 簡単なマッピング例
        category_mapping = {
            "プログラミング": ("技術書", ["プログラミング"]),
            "ビジネス": ("ビジネス書", ["経営・戦略"]),
            "その他": ("技術書", ["その他技術"])
        }
        
        if book.categories and len(book.categories) > 0:
            first_category = book.categories[0]
            if first_category in category_mapping:
                major, minors = category_mapping[first_category]
                book.category_structure = {
                    "major_category": major,
                    "minor_categories": minors
                }
                self.db.commit()
                self.db.refresh(book)
        
        return book
    
    def count_books(
        self,
        title: Optional[str] = None,
        author: Optional[str] = None,
        major_category: Optional[str] = None,
        minor_categories: Optional[List[str]] = None,
        status: Optional[BookStatus] = None,
        available_only: bool = False
    ) -> int:
        """検索条件に合致する書籍数をカウント"""
        query = self.db.query(Book)
        
        if title:
            query = query.filter(Book.title.ilike(f"%{title}%"))
        if author:
            query = query.filter(Book.author.ilike(f"%{author}%"))
        if status:
            query = query.filter(Book.status == status)
        if available_only:
            query = query.filter(
                and_(
                    Book.status == BookStatus.AVAILABLE,
                    Book.available_copies > 0
                )
            )
        
        books = query.all()
        
        # 階層カテゴリフィルタリングをPythonで実行
        if major_category or (minor_categories and len(minor_categories) > 0):
            filtered_books = []
            for book in books:
                if book.category_structure:
                    # 大項目チェック
                    if major_category:
                        book_major = book.category_structure.get("major_category", "")
                        if book_major != major_category:
                            continue
                    
                    # 中項目チェック
                    if minor_categories and len(minor_categories) > 0:
                        book_minors = book.category_structure.get("minor_categories", [])
                        # いずれかの中項目が一致すればOK
                        if not any(minor in book_minors for minor in minor_categories):
                            continue
                    
                    filtered_books.append(book)
            books = filtered_books
        
        return len(books) 