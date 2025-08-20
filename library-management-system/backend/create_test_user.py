#!/usr/bin/env python3
"""
テスト用管理者ユーザー作成スクリプト
"""
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.utils.auth import get_password_hash

# パスの設定
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.user import User, UserRole

# データベース接続設定
DATABASE_URL = "postgresql://library_user:library_password@localhost:5432/library_db"

def create_test_admin():
    """テスト用管理者ユーザー作成"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # 既存ユーザーをチェック
        existing_user = session.query(User).filter_by(email="admin@example.com").first()
        if existing_user:
            # パスワードを更新
            existing_user.hashed_password = get_password_hash("admin123")
            session.commit()
            print("✅ 既存の管理者ユーザーのパスワードを更新しました")
            print(f"Email: admin@example.com")
            print(f"Password: admin123")
            return existing_user
        
        # 新しいユーザーを作成
        admin_user = User(
            username="test_admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="テスト管理者",
            department="システム管理部",
            role=UserRole.ADMIN,
            is_active=True
        )
        
        session.add(admin_user)
        session.commit()
        
        print("✅ テスト用管理者ユーザーを作成しました")
        print(f"Email: admin@example.com")
        print(f"Password: admin123")
        print(f"Role: {admin_user.role.value}")
        
        return admin_user
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        session.rollback()
        return None
    finally:
        session.close()

if __name__ == "__main__":
    create_test_admin() 