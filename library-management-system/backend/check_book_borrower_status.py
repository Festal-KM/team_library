#!/usr/bin/env python3
import sys
sys.path.append('src')

from src.database.connection import get_db
from src.models.book import Book
from src.models.loan import Loan
from sqlalchemy.orm import Session

def check_book_borrower_status():
    """書籍の借り手情報とステータスを確認"""
    
    with next(get_db()) as db:
        print('📊 書籍の貸出状況詳細確認:')
        print('=' * 50)
        
        # 全書籍の状況をチェック
        all_books = db.query(Book).limit(10).all()
        print(f'📚 全書籍数: {len(all_books)}冊')
        
        for book in all_books:
            current_borrower_id = getattr(book, 'current_borrower_id', None)
            current_borrower_name = getattr(book, 'current_borrower_name', None)
            
            print(f'\n📖 書籍: {book.title[:30]}...')
            print(f'   ステータス: {book.status}')
            print(f'   利用可能コピー: {book.available_copies}/{book.total_copies}')
            print(f'   current_borrower_id: {current_borrower_id}')
            print(f'   current_borrower_name: {current_borrower_name}')
        
        print('\n' + '=' * 50)
        
        # アクティブな貸出記録をチェック
        active_loans = db.query(Loan).filter(Loan.return_date.is_(None)).all()
        print(f'🔄 アクティブな貸出記録: {len(active_loans)}件')
        
        for loan in active_loans:
            print(f'   📋 LoanID:{loan.id}, BookID:{loan.book_id}, UserID:{loan.user_id}')

if __name__ == "__main__":
    check_book_borrower_status() 