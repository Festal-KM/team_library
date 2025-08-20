#!/usr/bin/env python3
"""
空文字列ISBNをNULLに修正するスクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database.connection import get_db
from sqlalchemy import text

def fix_empty_isbn():
    """空文字列ISBNをNULLに修正"""
    db = next(get_db())
    
    try:
        # 現在の状況を確認
        result = db.execute(text("SELECT COUNT(*) FROM books WHERE isbn = ''"))
        empty_isbn_count = result.scalar()
        print(f"空文字列ISBNを持つ書籍: {empty_isbn_count}件")
        
        result = db.execute(text("SELECT COUNT(*) FROM books WHERE isbn = 'None'"))
        none_string_count = result.scalar()
        print(f"'None'文字列ISBNを持つ書籍: {none_string_count}件")
        
        # 空文字列ISBNをNULLに更新
        if empty_isbn_count > 0:
            result = db.execute(text("UPDATE books SET isbn = NULL WHERE isbn = ''"))
            print(f"✅ 空文字列ISBN {empty_isbn_count}件をNULLに更新しました")
        
        # 'None'文字列ISBNもNULLに更新
        if none_string_count > 0:
            result = db.execute(text("UPDATE books SET isbn = NULL WHERE isbn = 'None'"))
            print(f"✅ 'None'文字列ISBN {none_string_count}件をNULLに更新しました")
        
        db.commit()
        
        # 修正後の状況を確認
        result = db.execute(text("SELECT COUNT(*) FROM books WHERE isbn IS NULL"))
        null_isbn_count = result.scalar()
        print(f"修正後: NULL ISBNを持つ書籍: {null_isbn_count}件")
        
        return True
        
    except Exception as e:
        print(f"❌ エラー: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = fix_empty_isbn()
    sys.exit(0 if success else 1) 