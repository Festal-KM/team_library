#!/usr/bin/env python3
"""
パスワード修正スクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from src.database.connection import get_db_session
from src.models.user import User
from src.utils.auth import get_password_hash

def fix_user_passwords():
    """全ユーザーのパスワードを修正"""
    db = get_db_session()
    
    try:
        # 新しいパスワードを設定
        new_password = "password123"
        new_hash = get_password_hash(new_password)
        
        print(f"新しいハッシュ: {new_hash}")
        
        # 全ユーザーを取得
        users = db.query(User).all()
        
        for user in users:
            user.hashed_password = new_hash
            print(f"✅ {user.username} ({user.email}) のパスワードを更新")
        
        db.commit()
        print(f"\n{len(users)}人のユーザーのパスワードを更新しました")
        print(f"新しいパスワード: {new_password}")
        
        return True
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=== パスワード修正スクリプト ===")
    success = fix_user_passwords()
    print(f"結果: {'成功' if success else '失敗'}") 