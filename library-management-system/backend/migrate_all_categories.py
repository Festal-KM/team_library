#!/usr/bin/env python3
"""
全書籍のカテゴリ移行スクリプト
"""

from src.database.connection import get_db
from sqlalchemy import text
import json

def migrate_all_categories():
    """全書籍のカテゴリを階層構造に移行"""
    db = next(get_db())
    
    # カテゴリマッピング定義
    category_mapping = {
        "プログラミング": ("技術書", ["プログラミング"]),
        "ソフトウェア設計": ("技術書", ["ソフトウェア設計"]),
        "ソフトウェア開発": ("技術書", ["ソフトウェア開発"]),
        "ネットワーク": ("技術書", ["インフラ・ネットワーク"]),
        "データベース": ("技術書", ["データベース"]),
        "セキュリティ": ("技術書", ["セキュリティ"]),
        "AI/機械学習": ("技術書", ["AI・機械学習"]),
        "ビジネス": ("ビジネス書", ["経営・戦略"]),
        "書籍": ("一般書", ["実用書"]),
        "新着図書": ("技術書", []),
        "その他": ("技術書", ["その他技術"]),
        "ベストプラクティス": ("技術書", ["その他技術"]),
    }
    
    try:
        # 全書籍を取得
        result = db.execute(text("SELECT id, title, categories FROM books"))
        books_data = result.fetchall()
        
        print(f"移行対象書籍数: {len(books_data)}冊")
        
        migration_count = 0
        
        for book_id, title, categories_json in books_data:
            print(f"\n📖 処理中: {title} (ID: {book_id})")
            print(f"   現在のカテゴリ: {categories_json}")
            
            # デフォルト値
            major_category = "技術書"
            minor_categories = []
            
            if categories_json:
                all_minors = []
                for category in categories_json:
                    if category in category_mapping:
                        mapped_major, mapped_minors = category_mapping[category]
                        major_category = mapped_major  # 最後に処理されたものが優先
                        if mapped_minors:
                            all_minors.extend(mapped_minors)
                    else:
                        print(f"   ⚠️ 未知のカテゴリ: {category} → 技術書:その他技術")
                        major_category = "技術書"
                        all_minors.append("その他技術")
                
                # 重複除去
                minor_categories = list(dict.fromkeys(all_minors))
            
            # 新しいカテゴリ構造
            new_structure = {
                "major_category": major_category,
                "minor_categories": minor_categories
            }
            
            print(f"   → 新構造: {new_structure}")
            
            # 更新実行
            db.execute(text("""
                UPDATE books 
                SET category_structure = :structure_json
                WHERE id = :book_id
            """), {
                "structure_json": json.dumps(new_structure),
                "book_id": book_id
            })
            
            migration_count += 1
            print(f"   ✅ 更新完了")
        
        # 一括コミット
        db.commit()
        print(f"\n✅ 移行完了! {migration_count}冊の書籍を更新しました")
        
        # 移行結果確認
        print("\n📊 移行結果確認:")
        result = db.execute(text("SELECT id, title, category_structure FROM books ORDER BY id"))
        updated_books = result.fetchall()
        
        major_stats = {}
        for book_id, title, structure in updated_books:
            if structure:
                major = structure.get("major_category", "不明")
                minors = structure.get("minor_categories", [])
            else:
                major = "不明"
                minors = []
            
            major_stats[major] = major_stats.get(major, 0) + 1
            print(f"   ID:{book_id:2d} | {title[:40]:40s} | {major:8s} | {minors}")
        
        print(f"\n📈 大項目別統計:")
        for major, count in major_stats.items():
            print(f"   {major}: {count}冊")
            
    except Exception as e:
        print(f"\n❌ 移行エラー: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_all_categories() 