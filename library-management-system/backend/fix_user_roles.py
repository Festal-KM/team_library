#!/usr/bin/env python3
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# プロジェクトルートをPythonパスに追加
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from src.config.settings import settings

def fix_user_roles():
    """データベース内のユーザーロール値を正しいEnum値に修正"""
    
    # PostgreSQLデータベースに接続
    engine = create_engine(settings.database_url, echo=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            # 現在のユーザー一覧を確認
            result = db.execute(text("SELECT id, full_name, email, role FROM users"))
            users = result.fetchall()
            
            print("修正前のユーザー一覧:")
            print("-" * 80)
            for user in users:
                print(f'ID: {user[0]:<3} | Name: {user[1]:<20} | Email: {user[2]:<30} | Role: {user[3]}')
            print("-" * 80)
            
            # ロール値のマッピング
            role_mapping = {
                'admin': 'ADMIN',
                'approver': 'APPROVER', 
                'user': 'USER',
                'librarian': 'APPROVER',  # 古いlibrarianロールはapproverに変換
            }
            
            updated_count = 0
            
            # 各ユーザーのロールを修正
            for user in users:
                user_id, full_name, email, current_role = user
                
                if current_role in role_mapping:
                    new_role = role_mapping[current_role]
                    if current_role != new_role:
                        print(f"ユーザー ID {user_id} ({full_name}): {current_role} → {new_role}")
                        db.execute(
                            text("UPDATE users SET role = :new_role WHERE id = :user_id"),
                            {"new_role": new_role, "user_id": user_id}
                        )
                        updated_count += 1
                else:
                    print(f"警告: 不明なロール値 '{current_role}' が見つかりました (ユーザーID: {user_id})")
            
            if updated_count > 0:
                db.commit()
                print(f"\n{updated_count} 件のユーザーロールを修正しました。")
            else:
                print("\n修正が必要なユーザーロールはありませんでした。")
            
            # 修正後の確認
            result = db.execute(text("SELECT id, full_name, email, role FROM users"))
            updated_users = result.fetchall()
            
            print("\n修正後のユーザー一覧:")
            print("-" * 80)
            for user in updated_users:
                print(f'ID: {user[0]:<3} | Name: {user[1]:<20} | Email: {user[2]:<30} | Role: {user[3]}')
            print("-" * 80)
            
        except Exception as e:
            db.rollback()
            print(f"エラーが発生しました: {e}")
            raise

if __name__ == "__main__":
    try:
        fix_user_roles()
    except Exception as e:
        print(f"スクリプト実行エラー: {e}")
        sys.exit(1) 