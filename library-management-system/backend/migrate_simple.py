#!/usr/bin/env python3
"""
シンプルなカテゴリ移行スクリプト
"""

from src.database.connection import get_db
from sqlalchemy import text
import json

def migrate_simple():
    """シンプルなカテゴリ移行"""
    db = next(get_db())
    
    try:
        # まず1冊だけテストで更新
        test_structure = {
            "major_category": "技術書",
            "minor_categories": ["プログラミング"]
        }
        
        print("テスト更新実行中...")
        
        # 文字列として渡す
        result = db.execute(text("""
            UPDATE books 
            SET category_structure = :structure_json
            WHERE id = 1
        """), {
            "structure_json": json.dumps(test_structure)
        })
        
        db.commit()
        print("✅ テスト更新成功!")
        
        # 確認
        result = db.execute(text("SELECT id, title, category_structure FROM books WHERE id = 1"))
        row = result.fetchone()
        print(f"確認: ID:{row[0]}, Title:{row[1]}, Structure:{row[2]}")
        
    except Exception as e:
        print(f"❌ エラー: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_simple() 