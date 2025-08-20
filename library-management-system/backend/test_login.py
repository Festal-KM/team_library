#!/usr/bin/env python3
"""
ログイン機能テストスクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from src.database.connection import get_db_session
from src.models.user import User
from src.utils.auth import verify_password

def test_admin_login():
    """管理者ログインをテスト"""
    db = get_db_session()
    
    try:
        # 管理者ユーザーを取得
        user = db.query(User).filter(User.email == "admin@example.com").first()
        
        if not user:
            print("❌ 管理者ユーザーが見つかりません")
            return False
        
        print(f"✅ ユーザー見つかりました: {user.username} ({user.email})")
        print(f"   Role: {user.role}")
        print(f"   Full Name: {user.full_name}")
        print(f"   Password Hash: {user.hashed_password[:50]}...")
        
        # パスワード検証テスト
        password = "password123"
        is_valid = verify_password(password, user.hashed_password)
        
        if is_valid:
            print(f"✅ パスワード '{password}' は正しいです")
            return True
        else:
            print(f"❌ パスワード '{password}' は間違っています")
            return False
            
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=== 管理者ログインテスト ===")
    success = test_admin_login()
    print(f"結果: {'成功' if success else '失敗'}") 