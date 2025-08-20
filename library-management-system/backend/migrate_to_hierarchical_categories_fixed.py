#!/usr/bin/env python3
"""
既存書籍データを階層カテゴリ構造に移行するスクリプト（修正版）
"""

from src.database.connection import get_db
from sqlalchemy import text

def migrate_existing_categories_fixed():
    """既存のカテゴリデータを階層構造に移行（修正版）"""
    db = next(get_db())
    
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
        "ベストプラクティス": ("技術書", ["その他技術"]),  # 追加
    }
    
    try:
        # 既存書籍をRAWクエリで取得
        print("既存書籍データを取得中...")
        result = db.execute(text("SELECT id, title, categories FROM books"))
        books_data = result.fetchall()
        
        print(f"移行対象書籍数: {len(books_data)}冊")
        
        migration_count = 0
        
        for book_row in books_data:
            book_id, title, categories_json = book_row
            print(f"\n📖 処理中: {title} (ID: {book_id})")
            print(f"   現在のカテゴリ: {categories_json}")
            
            # 既存のcategoriesから大項目・中項目を決定
            major_category = "技術書"  # デフォルト
            minor_categories = []
            
            if categories_json:
                for category in categories_json:
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
            
            # 新しいカテゴリ構造
            new_structure = {
                "major_category": major_category,
                "minor_categories": minor_categories
            }
            
            print(f"   → 新構造: {new_structure}")
            
            # 個別に更新実行
            try:
                db.execute(text("""
                    UPDATE books 
                    SET category_structure = :new_structure::json
                    WHERE id = :book_id
                """), {
                    "new_structure": str(new_structure).replace("'", '"'),
                    "book_id": book_id
                })
                db.commit()
                migration_count += 1
                print(f"   ✅ 更新完了")
                
            except Exception as e:
                print(f"   ❌ 個別更新エラー: {e}")
                db.rollback()
        
        print(f"\n✅ 移行完了! {migration_count}冊の書籍を更新しました")
        
        # 4. 移行結果を確認
        print("\n📊 移行結果確認:")
        result = db.execute(text("SELECT id, title, category_structure FROM books"))
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
            print(f"   ID:{book_id} | {title[:30]}... | {major} | {minors}")
        
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
    migrate_existing_categories_fixed() 