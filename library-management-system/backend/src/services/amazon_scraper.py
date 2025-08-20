"""
Amazon書籍情報スクレイピングサービス
"""
import requests
from bs4 import BeautifulSoup
import re
import time
from typing import Optional, Dict, Any
from urllib.parse import unquote
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AmazonScraper:
    def __init__(self):
        self.session = requests.Session()
        # User-Agentを設定してブロックを回避
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1',
            'Cache-Control': 'max-age=0'
        })
    
    def extract_asin_from_url(self, url: str) -> Optional[str]:
        """AmazonのURLからASINを抽出"""
        try:
            patterns = [
                r'/dp/([A-Z0-9]{10})',
                r'/gp/product/([A-Z0-9]{10})',
                r'/product/([A-Z0-9]{10})',
                r'asin=([A-Z0-9]{10})',
                r'/([A-Z0-9]{10})(?:/|$|\?)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    return match.group(1)
            
            return None
        except Exception as e:
            logger.error(f"ASIN抽出エラー: {e}")
            return None
    
    def _extract_product_url_from_search(self, search_url: str) -> Optional[str]:
        """検索結果URLから最初の商品ページURLを抽出"""
        try:
            response = self.session.get(search_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 商品リンクを探すセレクター
            selectors = [
                'h2 a[href*="/dp/"]',
                '.s-title-instructions-style a[href*="/dp/"]',
                '[data-component-type="s-search-result"] h2 a',
                '.s-result-item [href*="/dp/"]'
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                for element in elements:
                    href = element.get('href')
                    if href and '/dp/' in href:
                        # 相対URLの場合は完全URLに変換
                        if href.startswith('/'):
                            return f"https://www.amazon.co.jp{href}"
                        elif href.startswith('https://'):
                            return href
            
            logger.warning("検索結果から商品URLを抽出できませんでした")
            return None
            
        except Exception as e:
            logger.error(f"検索結果URL抽出エラー: {e}")
            return None
    
    def scrape_amazon_book_info(self, url: str) -> Dict[str, Any]:
        """Amazon商品ページから書籍情報を取得"""
        try:
            # レート制限を考慮
            time.sleep(2)
            
            # URLをデコード
            decoded_url = unquote(url)
            

            
            asin = self.extract_asin_from_url(decoded_url)
            
            if not asin:
                raise Exception("ASINを抽出できませんでした")
            
            # Amazon商品ページにアクセス
            response = self.session.get(decoded_url, timeout=15)
            response.raise_for_status()
            
            # エンコーディングを明示的にUTF-8に設定
            response.encoding = 'utf-8'
            
            # BeautifulSoupでHTMLをパース（エンコーディング指定）
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 書籍情報を抽出
            book_info = self._extract_book_details(soup, asin, decoded_url)
            
            return {
                "success": True,
                "book_info": book_info
            }
            
        except Exception as e:
            logger.error(f"Amazon情報取得エラー: {e}")
            # エラー時はフォールバック情報を返す
            return self._get_fallback_info(url, asin if 'asin' in locals() else None)
    
    def _extract_book_details(self, soup: BeautifulSoup, asin: str, url: str) -> Dict[str, Any]:
        """BeautifulSoupオブジェクトから書籍詳細を抽出"""
        
        # タイトル抽出
        title = self._extract_title(soup)
        
        # 著者抽出
        author = self._extract_author(soup)
        
        # 出版社抽出
        publisher = self._extract_publisher(soup)
        
        # 価格抽出
        price = self._extract_price(soup)
        
        # 画像URL抽出
        cover_image = self._extract_image_url(soup)
        
        # ISBN抽出
        isbn = self._extract_isbn(soup)
        logger.info(f"抽出されたISBN: {isbn}")
        
        # ISBNが見つからない場合は外部APIを使用
        if not isbn and title:
            isbn = self._get_isbn_from_external_api(asin, title)
        
        # 説明抽出
        description = self._extract_description(soup)
        

        
        return {
            "title": title or "取得できませんでした",
            "author": author or "不明",
            "publisher": publisher or "不明",
            "isbn": isbn or "",
            "price": price or 0,
            "publication_date": "",
            "description": description or "Amazon商品ページから取得",
            "cover_image": cover_image or "/images/book-placeholder.svg",
            "category": "書籍",
            "page_count": 0,
            "asin": asin,
            "amazon_url": url
        }
    
    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """タイトルを抽出"""
        selectors = [
            '#productTitle',
            '.product-title',
            'h1.a-size-large',
            'h1 span'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return element.get_text(strip=True)
        
        return None
    
    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """著者を抽出"""
        selectors = [
            '.author .a-link-normal',
            '.by-author .a-link-normal',
            'span.author a',
            '.a-row .author a'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                authors = [elem.get_text(strip=True) for elem in elements]
                return ', '.join(authors)
        
        return None
    
    def _extract_publisher(self, soup: BeautifulSoup) -> Optional[str]:
        """出版社を抽出"""
        # 商品詳細から出版社を探す
        details = soup.find_all('span', class_='a-text-bold')
        for detail in details:
            if '出版社' in detail.get_text():
                next_span = detail.find_next_sibling('span')
                if next_span:
                    return next_span.get_text(strip=True)
        
        return None
    
    def _extract_price(self, soup: BeautifulSoup) -> Optional[int]:
        """価格を抽出"""
        selectors = [
            '.a-price-whole',
            '.a-offscreen',
            '.a-price .a-offscreen',
            '.kindle-price .a-offscreen'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                price_text = element.get_text(strip=True)
                # 数字のみを抽出
                price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                if price_match:
                    try:
                        return int(price_match.group().replace(',', ''))
                    except ValueError:
                        continue
        
        return None
    
    def _extract_image_url(self, soup: BeautifulSoup) -> Optional[str]:
        """商品画像URLを抽出"""
        selectors = [
            '#landingImage',
            '#imgBlkFront',
            '.a-dynamic-image',
            'img[data-old-hires]',
            'img[data-a-dynamic-image]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                # data-a-dynamic-image属性から最大サイズの画像を取得
                dynamic_image = element.get('data-a-dynamic-image')
                if dynamic_image:
                    try:
                        import json
                        image_data = json.loads(dynamic_image)
                        # 最大サイズの画像URLを取得
                        if image_data:
                            return list(image_data.keys())[0]
                    except:
                        pass
                
                # src属性から取得
                src = element.get('src')
                if src and 'images-amazon.com' in src:
                    return src
                
                # data-old-hires属性から取得
                hires = element.get('data-old-hires')
                if hires:
                    return hires
        
        return None
    
    def _extract_isbn(self, soup: BeautifulSoup) -> Optional[str]:
        """ISBNを抽出"""
        # 複数の方法でISBNを探す
        
        # 方法1: 商品詳細からISBNを探す
        details = soup.find_all('span', class_='a-text-bold')
        for detail in details:
            text = detail.get_text()
            if 'ISBN' in text:
                next_span = detail.find_next_sibling('span')
                if next_span:
                    isbn_text = next_span.get_text(strip=True)
                    # ISBN形式の数字を抽出
                    isbn_match = re.search(r'[\d-]{10,17}', isbn_text)
                    if isbn_match:
                        return isbn_match.group().replace('-', '')
        
        # 方法2: 商品詳細テーブルから探す
        detail_bullets = soup.find('div', {'id': 'detailBullets_feature_div'})
        if detail_bullets:
            for li in detail_bullets.find_all('li'):
                text = li.get_text()
                if 'ISBN' in text:
                    isbn_match = re.search(r'ISBN[:\-\s]*(\d{10,13})', text)
                    if isbn_match:
                        return isbn_match.group(1)
        
        # 方法3: 商品情報セクションから探す
        product_details = soup.find('div', {'id': 'productDetails_feature_div'})
        if product_details:
            for tr in product_details.find_all('tr'):
                th = tr.find('th')
                td = tr.find('td')
                if th and td:
                    if 'ISBN' in th.get_text():
                        isbn_text = td.get_text(strip=True)
                        isbn_match = re.search(r'[\d-]{10,17}', isbn_text)
                        if isbn_match:
                            return isbn_match.group().replace('-', '')
        
        # 方法4: 全体のテキストからISBNパターンを探す
        page_text = soup.get_text()
        isbn_patterns = [
            r'ISBN[:\-\s]*(\d{3}[-\s]?\d{1}[-\s]?\d{3}[-\s]?\d{5}[-\s]?\d{1})',  # ISBN-13
            r'ISBN[:\-\s]*(\d{1}[-\s]?\d{3}[-\s]?\d{5}[-\s]?\d{1})',  # ISBN-10
            r'(\d{13})',  # 13桁の数字
            r'(\d{10})'   # 10桁の数字
        ]
        
        for pattern in isbn_patterns:
            matches = re.findall(pattern, page_text)
            for match in matches:
                # ハイフンを除去
                clean_isbn = re.sub(r'[-\s]', '', match)
                # ISBN-10またはISBN-13の形式かチェック
                if len(clean_isbn) in [10, 13] and clean_isbn.isdigit():
                    return clean_isbn
        
        return None
    
    def _get_isbn_from_external_api(self, asin: str, title: str) -> Optional[str]:
        """外部APIを使用してISBNを取得"""
        try:
            # Google Books APIを使用してタイトルからISBNを検索
            if title:
                import urllib.parse
                encoded_title = urllib.parse.quote(title)
                api_url = f"https://www.googleapis.com/books/v1/volumes?q={encoded_title}&maxResults=5"
                
                response = requests.get(api_url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if 'items' in data:
                        for item in data['items']:
                            volume_info = item.get('volumeInfo', {})
                            industry_identifiers = volume_info.get('industryIdentifiers', [])
                            
                            for identifier in industry_identifiers:
                                if identifier.get('type') in ['ISBN_13', 'ISBN_10']:
                                    isbn = identifier.get('identifier', '').replace('-', '')
                                    if len(isbn) in [10, 13]:
                                        logger.info(f"Google Books APIからISBNを取得: {isbn}")
                                        return isbn
        except Exception as e:
            logger.error(f"外部API ISBN取得エラー: {e}")
        
        return None
    
    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """商品説明を抽出"""
        selectors = [
            '#feature-bullets ul',
            '.a-unordered-list.a-vertical',
            '#bookDescription_feature_div',
            '.book-description'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if len(text) > 50:  # 十分な長さの説明のみ
                    return text[:500] + "..." if len(text) > 500 else text
        
        return None
    
    def _get_fallback_info(self, url: str, asin: Optional[str]) -> Dict[str, Any]:
        """Amazon取得失敗時のフォールバック情報"""
        
        # OpenBD APIを試す
        try:
            if asin:
                openbd_info = self._get_from_openbd_by_asin(asin)
                if openbd_info["success"]:
                    return openbd_info
        except Exception as e:
            logger.error(f"OpenBD API エラー: {e}")
        
        # 最終的なフォールバック
        return {
            "success": False,
            "book_info": {
                "title": "書籍情報の取得に失敗しました。URLを確認してください。",
                "author": "不明",
                "publisher": "不明",
                "isbn": "",
                "price": 0,
                "publication_date": "",
                "description": "Amazon商品ページから情報を取得できませんでした。手動で入力してください。",
                "cover_image": "/images/book-placeholder.svg",
                "category": "書籍",
                "page_count": 0,
                "asin": asin or "",
                "amazon_url": url
            },
            "error": "書籍情報の取得に失敗しました。URLを確認してください。"
        }
    
    def _get_from_openbd_by_asin(self, asin: str) -> Dict[str, Any]:
        """OpenBD APIからASINで書籍情報を取得"""
        try:
            # ASINからISBNを逆引きできるサービスがないため、スキップ
            return {"success": False}
        except Exception as e:
            logger.error(f"OpenBD ASIN検索エラー: {e}")
            return {"success": False}

# グローバルインスタンス
amazon_scraper = AmazonScraper() 