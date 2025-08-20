#!/usr/bin/env python3
"""
ユーザーロール確認スクリプト
"""
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# パスの設定
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.user import User, UserRole

# データベース接続設定
DATABASE_URL = "postgresql://library_user:library_password@localhost:5432/library_db"

def check_users():
    """ユーザーロール確認"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        users = session.query(User).all()
        print("=== ユーザー一覧 ===")
        for user in users:
            role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
            print(f"ID: {user.id}, Email: {user.email}, Role: {role_str}, Active: {user.is_active}")
        
        # 管理者でログインテスト用
        admin_user = session.query(User).filter_by(email="admin@example.com").first()
        if admin_user:
            print(f"\n=== 管理者ユーザー詳細 ===")
            print(f"ID: {admin_user.id}")
            print(f"Username: {admin_user.username}")
            print(f"Email: {admin_user.email}")
            print(f"Role: {admin_user.role}")
            print(f"Role Value: {admin_user.role.value if hasattr(admin_user.role, 'value') else str(admin_user.role)}")
            print(f"Active: {admin_user.is_active}")
            
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_users() 