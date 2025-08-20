#!/usr/bin/env python3
"""
書籍ステータスの不整合を修正するスクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database.connection import get_db
from src.models.book import Book, BookStatus
from sqlalchemy import text

def fix_book_status():
    """書籍ステータスを修正"""
    db = next(get_db())
    
    try:
        # 現在のステータス値を確認
        result = db.execute(text("SELECT id, status FROM books LIMIT 10"))
        books_data = result.fetchall()
        
        print("現在の書籍ステータス:")
        for book_id, status in books_data:
            print(f"ID: {book_id}, Status: {status}")
        
        # 不正なステータス値を修正（小文字を大文字に変換）
        db.execute(text("""
            UPDATE books 
            SET status = 'AVAILABLE' 
            WHERE status = 'available'
        """))
        
        db.execute(text("""
            UPDATE books 
            SET status = 'BORROWED' 
            WHERE status = 'borrowed'
        """))
        
        db.execute(text("""
            UPDATE books 
            SET status = 'RESERVED' 
            WHERE status = 'reserved'
        """))
        
        db.execute(text("""
            UPDATE books 
            SET status = 'MAINTENANCE' 
            WHERE status = 'maintenance'
        """))
        
        db.execute(text("""
            UPDATE books 
            SET status = 'LOST' 
            WHERE status = 'lost'
        """))
        
        # 不正なステータス値を修正
        db.execute(text("""
            UPDATE books 
            SET status = 'AVAILABLE' 
            WHERE status NOT IN ('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST')
        """))
        
        # 確認
        result = db.execute(text("SELECT COUNT(*) FROM books"))
        total_books = result.scalar()
        print(f"総書籍数: {total_books}")
        
        # ステータス別の数を表示
        for status in BookStatus:
            result = db.execute(text("SELECT COUNT(*) FROM books WHERE status = :status"), {"status": status.value})
            count = result.scalar()
            print(f"{status.name} ({status.value}): {count}冊")
        
        db.commit()
        print("書籍ステータスの修正が完了しました")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_book_status() 