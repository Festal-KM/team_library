#!/usr/bin/env python3
import sys
import os
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# プロジェクトルートをPythonパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from src.models.user import User, UserRole

def create_approver_user():
    # SQLiteデータベースに直接接続
    engine = create_engine("sqlite:///library.db", echo=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # パスワードをハッシュ化
    password = "temppassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    with SessionLocal() as db:
        # 既存のapproverユーザーをチェック
        existing_approver = db.query(User).filter(User.email == "approver@company.com").first()
        if existing_approver:
            print(f"承認者ユーザーは既に存在します: {existing_approver.full_name} ({existing_approver.email})")
            return
        
        # 承認者ユーザーを作成
        approver_user = User(
            full_name="承認者　太郎",
            email="approver@company.com", 
            username="approver_taro",
            department="管理部",
            hashed_password=hashed_password,
            role=UserRole.APPROVER
        )
        
        db.add(approver_user)
        db.commit()
        db.refresh(approver_user)
        
        print(f"承認者ユーザーを作成しました:")
        print(f"  ID: {approver_user.id}")
        print(f"  名前: {approver_user.full_name}")
        print(f"  メール: {approver_user.email}")
        print(f"  ユーザー名: {approver_user.username}")
        print(f"  部署: {approver_user.department}")
        print(f"  ロール: {approver_user.role}")
        print(f"  パスワード: {password}")

if __name__ == "__main__":
    try:
        create_approver_user()
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1) 