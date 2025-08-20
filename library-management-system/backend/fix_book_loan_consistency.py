#!/usr/bin/env python3
import sys
sys.path.append('src')

from src.database.connection import get_db
from src.models.book import Book, BookStatus
from src.models.loan import Loan
from src.models.user import User
from sqlalchemy.orm import Session

def fix_book_loan_consistency():
    """書籍と貸出記録の整合性を修正"""
    
    with next(get_db()) as db:
        print('🔧 書籍と貸出記録の整合性修正開始...')
        print('=' * 60)
        
        # アクティブな貸出記録を取得
        active_loans = db.query(Loan).filter(Loan.return_date.is_(None)).all()
        print(f'📋 アクティブな貸出記録: {len(active_loans)}件')
        
        fixed_count = 0
        
        for loan in active_loans:
            # 書籍情報を取得
            book = db.query(Book).filter(Book.id == loan.book_id).first()
            if not book:
                print(f'❌ 書籍ID {loan.book_id} が見つかりません')
                continue
                
            # ユーザー情報を取得
            user = db.query(User).filter(User.id == loan.user_id).first()
            if not user:
                print(f'❌ ユーザーID {loan.user_id} が見つかりません')
                continue
            
            print(f'\n📖 修正対象書籍: {book.title[:40]}...')
            print(f'   現在のステータス: {book.status}')
            print(f'   利用可能コピー: {book.available_copies}/{book.total_copies}')
            print(f'   借り手: {user.full_name} (ID: {user.id})')
            
            # 書籍の状態を修正
            if book.available_copies == 0 and book.status == BookStatus.AVAILABLE:
                # ステータスを貸出中に変更
                book.status = BookStatus.BORROWED
                print('   ✅ ステータスをBORROWEDに変更')
                
            # 借り手情報を設定（フィールドが存在する場合）
            if hasattr(book, 'current_borrower_id'):
                book.current_borrower_id = user.id
                print(f'   ✅ current_borrower_id を {user.id} に設定')
                
            if hasattr(book, 'current_borrower_name'):
                book.current_borrower_name = user.full_name
                print(f'   ✅ current_borrower_name を {user.full_name} に設定')
            
            fixed_count += 1
        
        print(f'\n🎯 修正完了: {fixed_count}件の書籍を修正しました')
        
        # 変更をコミット
        try:
            db.commit()
            print('✅ データベースに変更を保存しました')
        except Exception as e:
            db.rollback()
            print(f'❌ 保存中にエラーが発生しました: {e}')
            return
        
        print('\n' + '=' * 60)
        print('📊 修正後の状況確認:')
        
        # 修正後の状況を確認
        for loan in active_loans:
            book = db.query(Book).filter(Book.id == loan.book_id).first()
            if book:
                current_borrower_id = getattr(book, 'current_borrower_id', 'フィールド無し')
                current_borrower_name = getattr(book, 'current_borrower_name', 'フィールド無し')
                
                print(f'\n📖 {book.title[:30]}...')
                print(f'   ステータス: {book.status}')
                print(f'   利用可能コピー: {book.available_copies}/{book.total_copies}')
                print(f'   current_borrower_id: {current_borrower_id}')
                print(f'   current_borrower_name: {current_borrower_name}')

if __name__ == "__main__":
    fix_book_loan_consistency() 