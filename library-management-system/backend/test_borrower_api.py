#!/usr/bin/env python3
import requests
import json

def test_borrower_info():
    """借り手情報APIテスト"""
    base_url = "http://localhost:8000"
    
    try:
        print("🔐 認証...")
        # ログイン
        login_data = {"email": "admin@example.com", "password": "admin123"}
        login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ ログイン失敗: {login_response.status_code}")
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ ログイン成功")
        
        print("\n📚 書籍一覧API テスト...")
        # 書籍一覧API呼び出し
        books_response = requests.get(f"{base_url}/api/books?per_page=10", headers=headers)
        
        if books_response.status_code != 200:
            print(f"❌ 書籍API失敗: {books_response.status_code}")
            print(f"レスポンス: {books_response.text}")
            return
        
        books_data = books_response.json()
        books = books_data.get("books", [])
        
        print(f"✅ 書籍取得成功: {len(books)}冊")
        
        # 貸出中の書籍をチェック
        borrowed_books = [book for book in books if book.get("status") == "BORROWED"]
        print(f"🔴 貸出中の書籍: {len(borrowed_books)}冊")
        
        for book in borrowed_books:
            print(f"\n📖 書籍: {book.get('title', 'タイトル不明')}")
            print(f"   ステータス: {book.get('status')}")
            print(f"   利用可能コピー: {book.get('available_copies')}/{book.get('total_copies')}")
            print(f"   current_borrower_id: {book.get('current_borrower_id')}")
            print(f"   current_borrower_name: {book.get('current_borrower_name')}")
            
            if book.get('current_borrower_id') is None:
                print("   ⚠️  current_borrower_id が None です！")
            if book.get('current_borrower_name') is None:
                print("   ⚠️  current_borrower_name が None です！")
        
        # 特定の書籍詳細をテスト（JavaScript: The Good Parts）
        print(f"\n📋 書籍詳細API テスト...")
        for book in borrowed_books[:1]:  # 最初の1冊だけテスト
            book_id = book.get('id')
            detail_response = requests.get(f"{base_url}/api/books/{book_id}", headers=headers)
            
            if detail_response.status_code == 200:
                detail_data = detail_response.json()
                print(f"✅ 書籍詳細取得成功: {detail_data.get('title')}")
                print(f"   current_borrower_id: {detail_data.get('current_borrower_id')}")
                print(f"   current_borrower_name: {detail_data.get('current_borrower_name')}")
            else:
                print(f"❌ 書籍詳細取得失敗: {detail_response.status_code}")
            
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_borrower_info() 