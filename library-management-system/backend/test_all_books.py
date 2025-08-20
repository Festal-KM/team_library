#!/usr/bin/env python3
import requests
import json

def test_all_books():
    """全書籍を取得して借り手情報確認"""
    try:
        # ログイン
        login_data = {"email": "admin@example.com", "password": "admin123"}
        login_response = requests.post("http://localhost:8000/api/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("📚 全書籍取得テスト...")
        books_response = requests.get("http://localhost:8000/api/books?per_page=50", headers=headers)
        books_data = books_response.json()
        books = books_data.get("books", [])

        print(f"取得した書籍数: {len(books)}冊")

        # ステータス別集計
        status_counts = {}
        borrowed_books = []
        for book in books:
            status = book.get("status")
            status_counts[status] = status_counts.get(status, 0) + 1
            if status == "BORROWED":
                borrowed_books.append(book)

        print(f"\n📊 APIレスポンス ステータス別集計:")
        for status, count in status_counts.items():
            print(f"   {status}: {count}冊")

        print(f"\n🔴 貸出中書籍詳細 ({len(borrowed_books)}冊):")
        for book in borrowed_books:
            print(f"   📖 ID:{book.get('id')} {book.get('title', '不明')[:40]}...")
            print(f"      借り手ID: {book.get('current_borrower_id')}")
            print(f"      借り手名: {book.get('current_borrower_name')}")
            print("      ---")

        if len(borrowed_books) == 0:
            print("   ⚠️  貸出中書籍がAPIレスポンスに含まれていません！")
            
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_all_books() 