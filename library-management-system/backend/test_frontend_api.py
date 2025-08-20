#!/usr/bin/env python3
"""
フロントエンドからのAPIアクセステスト
"""
import requests
import json

def test_frontend_api():
    """フロントエンド視点でのAPIテスト"""
    
    base_url = "http://localhost:8000"
    
    print("=== フロントエンドAPIアクセステスト ===")
    
    # 1. ログインテスト
    print("\n1. ログインテスト")
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data["access_token"]
            print(f"✅ ログイン成功: {access_token[:50]}...")
        else:
            print(f"❌ ログイン失敗: {login_response.status_code} - {login_response.text}")
            return
            
    except Exception as e:
        print(f"❌ ログインエラー: {e}")
        return
    
    # 2. 統計API CORSテスト
    print("\n2. 統計API CORSテスト")
    
    # 各月のテスト
    test_periods = ["2025-07", "2025-08", "2025-09"]
    
    for period in test_periods:
        print(f"\n--- {period} の統計データ ---")
        
        try:
            stats_response = requests.get(
                f"{base_url}/api/stats/reading-stats",
                params={
                    "period_type": "month",
                    "period_value": period
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Origin": "http://localhost:3000"  # フロントエンドのオリジンを模擬
                }
            )
            
            if stats_response.status_code == 200:
                data = stats_response.json()
                user_stats = data.get("user_stats", [])
                print(f"✅ 取得成功: {len(user_stats)}人のデータ")
                
                for i, user in enumerate(user_stats[:3], 1):  # 上位3名表示
                    print(f"  {i}位: {user['user_name']} - {user['completed_reads']}冊")
                    
            else:
                print(f"❌ 取得失敗: {stats_response.status_code}")
                print(f"   レスポンス: {stats_response.text}")
                
        except Exception as e:
            print(f"❌ APIエラー: {e}")
    
    # 3. CORS詳細チェック
    print("\n3. CORS詳細チェック")
    try:
        # プリフライトリクエストをシミュレート
        options_response = requests.options(
            f"{base_url}/api/stats/reading-stats",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,content-type"
            }
        )
        
        print(f"OPTIONS レスポンス: {options_response.status_code}")
        print(f"CORS ヘッダー: {dict(options_response.headers)}")
        
    except Exception as e:
        print(f"❌ CORS チェックエラー: {e}")

if __name__ == "__main__":
    test_frontend_api() 