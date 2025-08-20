"""
既存ユーザーにパスワードハッシュを追加するスクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from src.database.connection import get_db_session
from src.models.user import User
from src.utils.auth import get_password_hash

def add_passwords_to_users():
    """既存ユーザーにデフォルトパスワードを設定"""
    db = get_db_session()
    
    try:
        # 全ユーザーを取得
        users = db.query(User).all()
        
        # デフォルトパスワード
        default_password = "password123"
        hashed_password = get_password_hash(default_password)
        
        for user in users:
            # password_hashフィールドが空の場合にパスワードを設定
            if not user.password_hash:
                user.password_hash = hashed_password
                print(f"ユーザー {user.username} ({user.email}) にパスワードを設定しました")
        
        db.commit()
        print(f"\n{len(users)}人のユーザーにパスワードを設定しました")
        print(f"デフォルトパスワード: {default_password}")
        print("セキュリティのため、初回ログイン後にパスワードを変更してください")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_passwords_to_users() 