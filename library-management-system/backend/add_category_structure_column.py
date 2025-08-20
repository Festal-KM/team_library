#!/usr/bin/env python3
"""
category_structureカラムを追加するスクリプト
"""

from src.database.connection import get_db
from sqlalchemy import text

def add_category_structure_column():
    """category_structureカラムをbooksテーブルに追加"""
    db = next(get_db())
    
    try:
        print("category_structureカラムを追加中...")
        
        # PostgreSQLでカラムを追加
        db.execute(text("""
            ALTER TABLE books 
            ADD COLUMN IF NOT EXISTS category_structure JSON DEFAULT '{"major_category": "技術書", "minor_categories": []}'::json
        """))
        
        db.commit()
        print("✅ category_structureカラムの追加が完了しました")
        
        # 確認のためテーブル構造をチェック
        result = db.execute(text("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'books' AND column_name = 'category_structure'
        """))
        
        row = result.fetchone()
        if row:
            print(f"   カラム名: {row[0]}")
            print(f"   データ型: {row[1]}")
            print(f"   デフォルト値: {row[2]}")
        else:
            print("❌ カラムの追加に失敗しました")
            
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_category_structure_column() 