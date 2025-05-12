import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, Optional, Any
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ユーザーエージェント（ブラウザのように見せる）
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
}

def extract_amazon_product_id(url: str) -> Optional[str]:
    """AmazonのURLから商品IDを抽出する関数"""
    # ASIN/ISBN パターン: dp/{ID} または product/{ID}
    patterns = [
        r"amazon\.co\.jp/dp/([A-Z0-9]{10})/?",
        r"amazon\.co\.jp/.*/dp/([A-Z0-9]{10})/?",
        r"amazon\.co\.jp/.*/product/([A-Z0-9]{10})/?",
        r"amazon\.co\.jp/gp/product/([A-Z0-9]{10})/?",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def scrape_amazon_book_info(url: str) -> Dict[str, Any]:
    """Amazonのページをスクレイピングして書籍情報を抽出する関数"""
    result = {
        "title": None,
        "author": None,
        "publisher": None,
        "isbn": None,
        "price": None,
        "page_count": None,
        "cover_image": None,
        "description": None,
    }
    
    # 商品IDの抽出
    product_id = extract_amazon_product_id(url)
    if not product_id:
        logger.error(f"無効なAmazon URL: {url}")
        return result
    
    # 標準化されたURLを作成
    normalized_url = f"https://www.amazon.co.jp/dp/{product_id}/"
    
    try:
        # ページの取得
        response = requests.get(normalized_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        # HTMLの解析
        soup = BeautifulSoup(response.content, "lxml")
        
        # タイトルの抽出
        title_elem = soup.select_one("#productTitle")
        if title_elem:
            result["title"] = title_elem.get_text().strip()
        
        # 著者の抽出
        authors = []
        author_elems = soup.select('span.author a.a-link-normal')
        for author_elem in author_elems:
            if author_elem.get_text().strip():
                authors.append(author_elem.get_text().strip())
        
        if authors:
            result["author"] = ', '.join(authors)
        
        # 価格の抽出
        price_elem = soup.select_one('.a-price .a-offscreen')
        if price_elem:
            price_text = price_elem.get_text().strip()
            price_match = re.search(r'￥([0-9,]+)', price_text)
            if price_match:
                price_str = price_match.group(1).replace(',', '')
                try:
                    result["price"] = float(price_str)
                except ValueError:
                    pass
        
        # 表紙画像の抽出
        image_elem = soup.select_one('#imgBlkFront') or soup.select_one('#landingImage')
        if image_elem and 'data-a-dynamic-image' in image_elem.attrs:
            image_data = image_elem.get('data-a-dynamic-image')
            image_match = re.search(r'"([^"]+)"', image_data)
            if image_match:
                result["cover_image"] = image_match.group(1)
        
        # 説明文の抽出
        description_elem = soup.select_one('#bookDescription_feature_div .a-expander-content')
        if description_elem:
            result["description"] = description_elem.get_text().strip()
        
        # 製品詳細からの情報抽出
        detail_bullets = soup.select('#detailBullets_feature_div li .a-list-item')
        for bullet in detail_bullets:
            bullet_text = bullet.get_text().strip()
            
            # 出版社の抽出
            publisher_match = re.search(r'出版社\s*:\s*([^;]+)', bullet_text)
            if publisher_match:
                result["publisher"] = publisher_match.group(1).strip()
            
            # ISBNの抽出
            isbn_match = re.search(r'ISBN-13\s*:\s*([0-9-]+)', bullet_text) or re.search(r'ISBN-10\s*:\s*([0-9X-]+)', bullet_text)
            if isbn_match:
                result["isbn"] = isbn_match.group(1).replace('-', '')
            
            # ページ数の抽出
            page_match = re.search(r'ページ数\s*:\s*([0-9]+)', bullet_text)
            if page_match:
                try:
                    result["page_count"] = int(page_match.group(1))
                except ValueError:
                    pass
        
        # 代替ソースからの情報抽出
        if not result["publisher"] or not result["isbn"] or not result["page_count"]:
            product_details = soup.select('#productDetailsTable .content li') or soup.select('#detailsListWrapper li')
            for detail in product_details:
                detail_text = detail.get_text().strip()
                
                if not result["publisher"]:
                    publisher_match = re.search(r'出版社\s*:\s*([^;]+)', detail_text)
                    if publisher_match:
                        result["publisher"] = publisher_match.group(1).strip()
                
                if not result["isbn"]:
                    isbn_match = re.search(r'ISBN-13\s*:\s*([0-9-]+)', detail_text) or re.search(r'ISBN-10\s*:\s*([0-9X-]+)', detail_text)
                    if isbn_match:
                        result["isbn"] = isbn_match.group(1).replace('-', '')
                
                if not result["page_count"]:
                    page_match = re.search(r'単行本.*?([0-9]+)ページ', detail_text) or re.search(r'ページ数\s*:\s*([0-9]+)', detail_text)
                    if page_match:
                        try:
                            result["page_count"] = int(page_match.group(1))
                        except ValueError:
                            pass
        
        logger.info(f"AmazonからISBN {result['isbn']} の書籍情報を取得しました: {result['title']}")
        
    except Exception as e:
        logger.error(f"スクレイピングエラー: {e}")
    
    return result 