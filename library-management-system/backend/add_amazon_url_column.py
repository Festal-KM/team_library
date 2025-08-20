#!/usr/bin/env python3
"""
purchase_requestsテーブルにamazon_urlカラムを追加するスクリプト
"""
import os
import sys
from sqlalchemy import create_engine, text

# 設定から正しいデータベースURLを取得
DATABASE_URL = "postgresql+psycopg://library_user:library_password@localhost:5432/library_db"

def add_amazon_url_column():
    """amazon_urlカラムを追加"""
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # まず、カラムが既に存在するかチェック
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'purchase_requests' 
                AND column_name = 'amazon_url'
            """)
            
            result = conn.execute(check_sql)
            existing_column = result.fetchone()
            
            if existing_column:
                print("amazon_urlカラムは既に存在します")
                return
            
            # カラムを追加
            add_column_sql = text("""
                ALTER TABLE purchase_requests 
                ADD COLUMN amazon_url VARCHAR(1000)
            """)
            
            conn.execute(add_column_sql)
            conn.commit()
            print("amazon_urlカラムを正常に追加しました")
            
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_amazon_url_column() 