#!/usr/bin/env python3
"""
書籍一覧APIの問題を特定するテストスクリプト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database.connection import get_db
from src.services.book_service import BookService
from src.schemas.book import BookResponse, BookListResponse

def test_book_list_api():
    """書籍一覧APIの処理をテスト"""
    db = next(get_db())
    
    try:
        service = BookService(db)
        
        # 書籍を取得
        books = service.get_books(skip=0, limit=3)
        print(f"Books retrieved: {len(books)}")
        
        # 各書籍をBookResponseに変換
        book_responses = []
        for i, book in enumerate(books):
            try:
                print(f"Converting book {i+1}: {book.title[:30]}")
                response = BookResponse.model_validate(book)
                book_responses.append(response)
                print(f"  ✅ Success")
            except Exception as e:
                print(f"  ❌ Failed: {e}")
                return False
        
        # BookListResponseを作成
        try:
            print("Creating BookListResponse...")
            list_response = BookListResponse(
                books=book_responses,
                total=len(book_responses),
                page=1,
                per_page=3,
                has_next=False,
                has_prev=False
            )
            print("✅ BookListResponse creation successful!")
            return True
        except Exception as e:
            print(f"❌ BookListResponse creation failed: {e}")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_book_list_api()
    sys.exit(0 if success else 1) 