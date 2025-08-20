#!/usr/bin/env python3
"""
BookResponseの変換問題をテストするスクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database.connection import get_db
from src.services.book_service import BookService
from src.schemas.book import BookResponse

def test_book_response():
    """BookResponseの変換をテスト"""
    db = next(get_db())
    
    try:
        service = BookService(db)
        books = service.get_books(limit=1)
        print(f"Books found: {len(books)}")
        
        if books:
            book = books[0]
            print(f"Testing book ID: {book.id}")
            print(f"Book title: {book.title}")
            print(f"Book status: {book.status} (type: {type(book.status)})")
            print(f"Book status value: {book.status.value if hasattr(book.status, 'value') else book.status}")
            
            # BookResponseに変換してみる
            try:
                response = BookResponse.model_validate(book)
                print("✅ BookResponse conversion successful!")
                return True
            except Exception as e:
                print(f"❌ BookResponse conversion failed: {e}")
                return False
        else:
            print("No books found")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_book_response()
    sys.exit(0 if success else 1) 