#!/usr/bin/env python3
"""
書籍APIエラー修正スクリプト
"""
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# パスの設定
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.book import Book, BookStatus

# データベース接続設定
DATABASE_URL = "postgresql://library_user:library_password@localhost:5432/library_db"

def test_books_query():
    """書籍クエリをテストする"""
    print("=== 書籍クエリテスト ===")
    
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        # 基本的な書籍取得
        books = session.query(Book).limit(5).all()
        print(f"✅ 書籍数: {len(books)}")
        
        for book in books:
            print(f"  - {book.title} by {book.author} (Status: {book.status})")
        
        # 利用可能な書籍のみ
        available_books = session.query(Book).filter(
            Book.status == BookStatus.AVAILABLE
        ).limit(3).all()
        print(f"✅ 利用可能書籍数: {len(available_books)}")
        
        session.close()
        return True
        
    except Exception as e:
        print(f"❌ クエリエラー: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_books_query() 