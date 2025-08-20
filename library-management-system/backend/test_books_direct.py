#!/usr/bin/env python3
import requests
import json

def test_books_api():
    """書籍APIを直接テストする"""
    base_url = "http://localhost:8000"
    
    try:
        print("🔐 認証テスト...")
        # ログイン
        login_data = {"email": "admin@example.com", "password": "admin123"}
        login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ ログイン失敗: {login_response.status_code}")
            print(f"レスポンス: {login_response.text}")
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ ログイン成功")
        
        print("\n🧪 テストAPI呼び出し...")
        # テストAPI呼び出し
        test_response = requests.get(f"{base_url}/api/books/test", headers=headers)
        
        print(f"📊 ステータスコード: {test_response.status_code}")
        print(f"📋 レスポンス: {test_response.text}")
        
        if test_response.status_code == 200:
            result = test_response.json()
            print("✅ テストAPI成功")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"❌ テストAPI失敗: {test_response.status_code}")
            
        print("\n📚 書籍一覧API呼び出し...")
        # 書籍一覧API呼び出し
        books_response = requests.get(f"{base_url}/api/books?per_page=1", headers=headers)
        
        print(f"📊 ステータスコード: {books_response.status_code}")
        print(f"📋 レスポンス: {books_response.text[:500]}...")  # 最初の500文字
        
        if books_response.status_code == 200:
            print("✅ 書籍一覧API成功")
        else:
            print(f"❌ 書籍一覧API失敗: {books_response.status_code}")
            
    except Exception as e:
        print(f"❌ エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_books_api() 