#!/usr/bin/env python3
"""
既存書籍データを階層カテゴリ構造に移行するスクリプト
"""

from src.database.connection import get_db
from src.models.book import Book
from src.config.categories import CATEGORY_STRUCTURE, MAJOR_CATEGORIES
from sqlalchemy import text

def migrate_existing_categories():
    """既存のカテゴリデータを階層構造に移行"""
    db = next(get_db())
    
    # 既存書籍を取得
    books = db.query(Book).all()
    print(f"移行対象書籍数: {len(books)}冊")
    
    # カテゴリマッピング定義
    category_mapping = {
        # 既存カテゴリ → (大項目, 中項目)
        "プログラミング": ("技術書", ["プログラミング"]),
        "ソフトウェア設計": ("技術書", ["ソフトウェア設計"]),
        "ソフトウェア開発": ("技術書", ["ソフトウェア開発"]),
        "ネットワーク": ("技術書", ["インフラ・ネットワーク"]),
        "データベース": ("技術書", ["データベース"]),
        "セキュリティ": ("技術書", ["セキュリティ"]),
        "AI/機械学習": ("技術書", ["AI・機械学習"]),
        "ビジネス": ("ビジネス書", ["経営・戦略"]),
        "書籍": ("一般書", ["実用書"]),
        "新着図書": ("技術書", []),  # 新着図書は大項目のみ
        "その他": ("技術書", ["その他技術"]),
    }
    
    try:
        # 1. まずcategory_structureカラムを追加（存在しない場合）
        print("1. category_structureカラムを追加中...")
        try:
            db.execute(text("""
                ALTER TABLE books 
                ADD COLUMN category_structure JSON DEFAULT '{"major_category": "技術書", "minor_categories": []}'
            """))
            db.commit()
            print("   ✓ category_structureカラムを追加しました")
        except Exception as e:
            if "already exists" in str(e) or "duplicate column" in str(e):
                print("   ⚠️ category_structureカラムは既に存在します")
            else:
                print(f"   ❌ カラム追加エラー: {e}")
                # エラーが発生してもロールバックして継続
                db.rollback()
        
        # 2. 各書籍のカテゴリを移行
        print("\n2. 書籍カテゴリを移行中...")
        migration_count = 0
        
        for book in books:
            print(f"\n📖 処理中: {book.title} (ID: {book.id})")
            print(f"   現在のカテゴリ: {book.categories}")
            
            # 既存のcategoriesから大項目・中項目を決定
            major_category = "技術書"  # デフォルト
            minor_categories = []
            
            if book.categories:
                for category in book.categories:
                    if category in category_mapping:
                        mapped_major, mapped_minors = category_mapping[category]
                        major_category = mapped_major
                        if mapped_minors:
                            minor_categories.extend(mapped_minors)
                    else:
                        # 未知のカテゴリは技術書の「その他技術」に分類
                        print(f"   ⚠️ 未知のカテゴリ: {category} → 技術書:その他技術")
                        major_category = "技術書"
                        minor_categories.append("その他技術")
            
            # 重複除去
            minor_categories = list(dict.fromkeys(minor_categories))
            
            # 新しいカテゴリ構造を設定
            new_structure = {
                "major_category": major_category,
                "minor_categories": minor_categories
            }
            
            book.category_structure = new_structure
            migration_count += 1
            
            print(f"   → 新構造: {new_structure}")
        
        # 3. 変更をコミット
        db.commit()
        print(f"\n✅ 移行完了! {migration_count}冊の書籍を更新しました")
        
        # 4. 移行結果を確認
        print("\n📊 移行結果確認:")
        updated_books = db.query(Book).all()
        
        major_stats = {}
        for book in updated_books:
            major = book.major_category
            major_stats[major] = major_stats.get(major, 0) + 1
            print(f"   ID:{book.id} | {book.title[:30]}... | {major} | {book.minor_categories}")
        
        print(f"\n📈 大項目別統計:")
        for major, count in major_stats.items():
            print(f"   {major}: {count}冊")
            
    except Exception as e:
        print(f"\n❌ 移行エラーが発生しました: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_existing_categories() 