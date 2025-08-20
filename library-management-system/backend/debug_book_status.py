#!/usr/bin/env python3
import requests
import json

def debug_book_status():
    """APIレスポンスの書籍ステータスをデバッグ"""
    base_url = "http://localhost:8000"
    
    try:
        # ログイン
        login_data = {"email": "admin@example.com", "password": "admin123"}
        login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("📚 書籍一覧API レスポンス詳細確認...")
        books_response = requests.get(f"{base_url}/api/books?per_page=10", headers=headers)
        books_data = books_response.json()
        books = books_data.get("books", [])
        
        print(f"取得した書籍数: {len(books)}冊")
        print("=" * 80)
        
        for i, book in enumerate(books, 1):
            print(f"{i:2d}. 📖 {book.get('title', 'タイトル不明')[:40]}...")
            print(f"    ID: {book.get('id')}")
            print(f"    Status: {book.get('status')} (型: {type(book.get('status'))})")
            print(f"    Available copies: {book.get('available_copies')}/{book.get('total_copies')}")
            print(f"    current_borrower_id: {book.get('current_borrower_id')}")
            print(f"    current_borrower_name: {book.get('current_borrower_name')}")
            print(f"    Raw book data: {json.dumps(book, indent=2, ensure_ascii=False)}")
            print("-" * 60)
            
        # ステータス別の集計
        status_counts = {}
        for book in books:
            status = book.get('status')
            status_counts[status] = status_counts.get(status, 0) + 1
            
        print(f"\n📊 ステータス別集計:")
        for status, count in status_counts.items():
            print(f"   {status}: {count}冊")
            
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_book_status() 