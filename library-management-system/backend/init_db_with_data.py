#!/usr/bin/env python3
"""
データベース初期化とテストデータ投入スクリプト
月間読書量ランキング用のサンプルデータを作成します
"""
import sys
import os
from datetime import date, datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# パスの設定
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.base import BaseModel
from src.models.user import User, UserRole
from src.models.book import Book, BookStatus
from src.models.loan import Loan, LoanStatus
from src.models.reservation import Reservation
from src.models.purchase_request import PurchaseRequest

# データベース接続設定
DATABASE_URL = "postgresql://library_user:library_password@localhost:5432/library_db"

def create_tables():
    """テーブル作成"""
    print("📋 テーブルを作成しています...")
    engine = create_engine(DATABASE_URL)
    BaseModel.metadata.create_all(bind=engine)
    print("✅ テーブル作成完了")
    return engine

def create_test_users(session):
    """テストユーザー作成"""
    print("👥 テストユーザーを作成しています...")
    
    users_data = [
        {
            "username": "watanabe_oryou",
            "email": "watanabe@company.com",
            "hashed_password": "$2b$12$example_hash_1",
            "full_name": "渡辺おりょう",
            "department": "営業",
            "role": UserRole.USER
        },
        {
            "username": "honda_takahiro",
            "email": "honda@company.com",
            "hashed_password": "$2b$12$example_hash_2",
            "full_name": "本田貴裕",
            "department": "コンサル事業部",
            "role": UserRole.ADMIN
        },
        {
            "username": "user1",
            "email": "user1@company.com",
            "hashed_password": "$2b$12$example_hash_3",
            "full_name": "ユーザー1",
            "department": "開発部",
            "role": UserRole.USER
        },
        {
            "username": "user2",
            "email": "user2@company.com",
            "hashed_password": "$2b$12$example_hash_4",
            "full_name": "ユーザー2",
            "department": "デザイン部",
            "role": UserRole.USER
        },
        {
            "username": "test_admin",
            "email": "admin@company.com",
            "hashed_password": "$2b$12$example_hash_5",
            "full_name": "テスト管理者",
            "department": "テスト部門",
            "role": UserRole.ADMIN
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # 既存ユーザーをチェック
        existing_user = session.query(User).filter_by(username=user_data["username"]).first()
        if not existing_user:
            user = User(**user_data)
            session.add(user)
            created_users.append(user)
        else:
            created_users.append(existing_user)
    
    session.commit()
    print(f"✅ {len(created_users)}人のユーザーを作成しました")
    return created_users

def create_test_books(session):
    """テスト書籍作成"""
    print("📚 テスト書籍を作成しています...")
    
    books_data = [
        {
            "title": "クリーンアーキテクチャ",
            "author": "Robert C. Martin",
            "isbn": "9784048930659",
            "publisher": "アスキー",
            "category_structure": {"major_category": "技術書", "minor_categories": ["アーキテクチャ", "設計"]},
            "location": "A-01-01",
            "status": BookStatus.AVAILABLE
        },
        {
            "title": "ドメイン駆動設計",
            "author": "Eric Evans",
            "isbn": "9784798121963",
            "publisher": "翔泳社",
            "category_structure": {"major_category": "技術書", "minor_categories": ["設計", "DDD"]},
            "location": "A-01-02",
            "status": BookStatus.AVAILABLE
        },
        {
            "title": "リーダブルコード",
            "author": "Dustin Boswell",
            "isbn": "9784873115658",
            "publisher": "オライリー",
            "category_structure": {"major_category": "技術書", "minor_categories": ["プログラミング", "コード品質"]},
            "location": "A-02-01",
            "status": BookStatus.AVAILABLE
        },
        {
            "title": "入門Kubernetes",
            "author": "Kelsey Hightower",
            "isbn": "9784873119014",
            "publisher": "オライリー",
            "category_structure": {"major_category": "技術書", "minor_categories": ["インフラ", "コンテナ"]},
            "location": "A-03-01",
            "status": BookStatus.AVAILABLE
        },
        {
            "title": "Python実践入門",
            "author": "大津真",
            "isbn": "9784297100735",
            "publisher": "技術評論社",
            "category_structure": {"major_category": "技術書", "minor_categories": ["Python", "プログラミング"]},
            "location": "B-01-01",
            "status": BookStatus.AVAILABLE
        },
        {
            "title": "React実践の教科書",
            "author": "岡田 拓巳",
            "isbn": "9784839974169",
            "publisher": "マイナビ出版",
            "category_structure": {"major_category": "技術書", "minor_categories": ["フロントエンド", "React"]},
            "location": "B-02-01",
            "status": BookStatus.AVAILABLE
        },
        {
            "title": "データベース実践入門",
            "author": "奥野 幹也",
            "isbn": "9784774142043",
            "publisher": "技術評論社",
            "category_structure": {"major_category": "技術書", "minor_categories": ["データベース", "SQL"]},
            "location": "C-01-01",
            "status": BookStatus.AVAILABLE
        }
    ]
    
    created_books = []
    for book_data in books_data:
        # 既存書籍をチェック
        existing_book = session.query(Book).filter_by(isbn=book_data["isbn"]).first()
        if not existing_book:
            book = Book(**book_data)
            session.add(book)
            created_books.append(book)
        else:
            created_books.append(existing_book)
    
    session.commit()
    print(f"✅ {len(created_books)}冊の書籍を作成しました")
    return created_books

def create_test_loans(session, users, books):
    """テスト貸出データ作成（2025年8月の読書統計用）"""
    print("📖 テスト貸出データを作成しています...")
    
    # 2025年8月の返却データを作成
    august_loans = [
        # 渡辺おりょう（2冊返却）
        {
            "user": users[0],  # 渡辺おりょう
            "book": books[0],  # クリーンアーキテクチャ
            "loan_date": date(2025, 7, 15),
            "due_date": date(2025, 8, 14),
            "return_date": date(2025, 8, 10),
            "status": LoanStatus.RETURNED
        },
        {
            "user": users[0],  # 渡辺おりょう
            "book": books[1],  # ドメイン駆動設計
            "loan_date": date(2025, 8, 1),
            "due_date": date(2025, 8, 31),
            "return_date": date(2025, 8, 25),
            "status": LoanStatus.RETURNED
        },
        
        # 本田貴裕（3冊返却）
        {
            "user": users[1],  # 本田貴裕
            "book": books[2],  # リーダブルコード
            "loan_date": date(2025, 7, 20),
            "due_date": date(2025, 8, 19),
            "return_date": date(2025, 8, 5),
            "status": LoanStatus.RETURNED
        },
        {
            "user": users[1],  # 本田貴裕
            "book": books[3],  # 入門Kubernetes
            "loan_date": date(2025, 8, 3),
            "due_date": date(2025, 9, 2),
            "return_date": date(2025, 8, 15),
            "status": LoanStatus.RETURNED
        },
        {
            "user": users[1],  # 本田貴裕
            "book": books[4],  # Python実践入門
            "loan_date": date(2025, 8, 10),
            "due_date": date(2025, 9, 9),
            "return_date": date(2025, 8, 28),
            "status": LoanStatus.RETURNED
        },
        
        # ユーザー1（0冊返却）
        
        # ユーザー2（2冊返却）
        {
            "user": users[3],  # ユーザー2
            "book": books[5],  # React実践の教科書
            "loan_date": date(2025, 8, 5),
            "due_date": date(2025, 9, 4),
            "return_date": date(2025, 8, 20),
            "status": LoanStatus.RETURNED
        },
        {
            "user": users[3],  # ユーザー2
            "book": books[6],  # データベース実践入門
            "loan_date": date(2025, 8, 12),
            "due_date": date(2025, 9, 11),
            "return_date": date(2025, 8, 30),
            "status": LoanStatus.RETURNED
        },
        
        # テスト管理者（1冊返却）
        {
            "user": users[4],  # テスト管理者
            "book": books[0],  # クリーンアーキテクチャ（別期間）
            "loan_date": date(2025, 8, 15),
            "due_date": date(2025, 9, 14),
            "return_date": date(2025, 8, 29),
            "status": LoanStatus.RETURNED
        }
    ]
    
    # 現在貸出中のデータも追加
    current_loans = [
        # 各ユーザーの現在貸出中の書籍
        {
            "user": users[0],  # 渡辺おりょう
            "book": books[2],  # リーダブルコード
            "loan_date": date(2025, 8, 25),
            "due_date": date(2025, 9, 24),
            "return_date": None,
            "status": LoanStatus.ACTIVE
        },
        {
            "user": users[0],  # 渡辺おりょう
            "book": books[3],  # 入門Kubernetes
            "loan_date": date(2025, 8, 28),
            "due_date": date(2025, 9, 27),
            "return_date": None,
            "status": LoanStatus.ACTIVE
        },
        {
            "user": users[1],  # 本田貴裕
            "book": books[5],  # React実践の教科書
            "loan_date": date(2025, 8, 30),
            "due_date": date(2025, 9, 29),
            "return_date": None,
            "status": LoanStatus.ACTIVE
        },
        {
            "user": users[1],  # 本田貴裕
            "book": books[6],  # データベース実践入門
            "loan_date": date(2025, 8, 31),
            "due_date": date(2025, 9, 30),
            "return_date": None,
            "status": LoanStatus.ACTIVE
        },
        {
            "user": users[1],  # 本田貴裕
            "book": books[1],  # ドメイン駆動設計
            "loan_date": date(2025, 8, 31),
            "due_date": date(2025, 9, 30),
            "return_date": None,
            "status": LoanStatus.ACTIVE
        },
        {
            "user": users[4],  # テスト管理者
            "book": books[4],  # Python実践入門
            "loan_date": date(2025, 8, 31),
            "due_date": date(2025, 9, 30),
            "return_date": None,
            "status": LoanStatus.ACTIVE
        }
    ]
    
    all_loans = august_loans + current_loans
    created_loans = []
    
    for loan_data in all_loans:
        loan = Loan(
            user_id=loan_data["user"].id,
            book_id=loan_data["book"].id,
            loan_date=loan_data["loan_date"],
            due_date=loan_data["due_date"],
            return_date=loan_data["return_date"],
            status=loan_data["status"]
        )
        session.add(loan)
        created_loans.append(loan)
    
    session.commit()
    print(f"✅ {len(created_loans)}件の貸出データを作成しました")
    print(f"   - 2025年8月返却: {len(august_loans)}件")
    print(f"   - 現在貸出中: {len(current_loans)}件")
    return created_loans

def verify_data(session):
    """データ検証"""
    print("🔍 作成したデータを検証しています...")
    
    # 2025年8月の返却統計
    august_returns = session.execute(text("""
        SELECT u.full_name, COUNT(*) as return_count
        FROM loans l
        JOIN users u ON l.user_id = u.id
        WHERE l.return_date >= '2025-08-01' AND l.return_date < '2025-09-01'
        GROUP BY u.id, u.full_name
        ORDER BY return_count DESC
    """)).fetchall()
    
    print("\n📊 2025年8月の返却統計:")
    for i, (name, count) in enumerate(august_returns, 1):
        print(f"  {i}位: {name} - {count}冊")
    
    # 現在貸出中統計
    current_loans = session.execute(text("""
        SELECT u.full_name, COUNT(*) as loan_count
        FROM loans l
        JOIN users u ON l.user_id = u.id
        WHERE l.status = 'active'
        GROUP BY u.id, u.full_name
        ORDER BY loan_count DESC
    """)).fetchall()
    
    print("\n📖 現在貸出中統計:")
    for name, count in current_loans:
        print(f"  {name}: {count}冊")

def main():
    """メイン処理"""
    print("=== データベース初期化開始 ===")
    
    try:
        # テーブル作成
        engine = create_tables()
        
        # セッション作成
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        # データ作成
        users = create_test_users(session)
        books = create_test_books(session)
        loans = create_test_loans(session, users, books)
        
        # データ検証
        verify_data(session)
        
        session.close()
        print("\n✅ データベース初期化が完了しました！")
        print("🎯 月間読書量ランキングのテストデータが準備できました")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 