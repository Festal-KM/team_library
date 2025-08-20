"""
画像プロキシAPI - CORS問題を解決するため
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/image-proxy", summary="画像プロキシ")
@router.options("/image-proxy", summary="画像プロキシ CORS プリフライト")
async def proxy_image(url: str = Query(..., description="画像のURL")):
    """外部画像をプロキシして返す（CORS問題を解決）"""
    try:
        # URLの検証
        if not url:
            raise HTTPException(status_code=400, detail="画像URLが必要です")
        
        # 許可されたドメインのチェック
        allowed_domains = [
            'images-amazon.com',
            'covers.openlibrary.org',
            'm.media-amazon.com',
            'images-na.ssl-images-amazon.com',
            'google.com'  # テスト用
        ]
        
        if not any(domain in url for domain in allowed_domains):
            raise HTTPException(status_code=400, detail="許可されていないドメインです")
        
        # 画像を取得
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Referer': 'https://www.amazon.co.jp/',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Content-Typeを取得
        content_type = response.headers.get('content-type', 'image/jpeg')
        
        # 画像データを返す
        return Response(
            content=response.content,
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600',  # 1時間キャッシュ
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Credentials': 'false',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            }
        )
        
    except requests.RequestException as e:
        logger.error(f"画像取得エラー: {e}")
        raise HTTPException(status_code=404, detail="画像を取得できませんでした")
    except Exception as e:
        logger.error(f"画像プロキシエラー: {e}")
        raise HTTPException(status_code=500, detail="画像プロキシでエラーが発生しました")


@router.get("/image-base64", summary="画像をBase64で取得")
async def get_image_as_base64(url: str = Query(..., description="画像のURL")):
    """外部画像をBase64エンコードして返す"""
    try:
        # URLの検証
        if not url:
            raise HTTPException(status_code=400, detail="画像URLが必要です")
        
        # 許可されたドメインのチェック
        allowed_domains = [
            'images-amazon.com',
            'covers.openlibrary.org',
            'm.media-amazon.com',
            'images-na.ssl-images-amazon.com'
        ]
        
        if not any(domain in url for domain in allowed_domains):
            raise HTTPException(status_code=400, detail="許可されていないドメインです")
        
        # 画像を取得
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Referer': 'https://www.amazon.co.jp/',
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Base64エンコード
        import base64
        encoded_image = base64.b64encode(response.content).decode('utf-8')
        content_type = response.headers.get('content-type', 'image/jpeg')
        
        return {
            "success": True,
            "data_url": f"data:{content_type};base64,{encoded_image}",
            "content_type": content_type,
            "size": len(response.content)
        }
        
    except requests.RequestException as e:
        logger.error(f"画像取得エラー: {e}")
        raise HTTPException(status_code=404, detail="画像を取得できませんでした")
    except Exception as e:
        logger.error(f"画像Base64エラー: {e}")
        raise HTTPException(status_code=500, detail="画像のBase64変換でエラーが発生しました") 