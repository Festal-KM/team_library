#!/usr/bin/env python3
"""
データベースの貸出データを確認するスクリプト
"""
import sqlite3
import sys
import os

def check_database_data():
    """データベースの内容を確認"""
    db_path = "library.db"
    
    if not os.path.exists(db_path):
        print("❌ データベースファイルが見つかりません")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # テーブル一覧
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("📁 テーブル一覧:", [table[0] for table in tables])
        
        # Loansテーブルの存在確認
        if ('loans',) not in tables:
            print("❌ loansテーブルが見つかりません")
            return
        
        # 貸出データ総数
        cursor.execute("SELECT COUNT(*) FROM loans")
        total_loans = cursor.fetchone()[0]
        print(f"📊 総貸出数: {total_loans}")
        
        # 返却済みデータ数
        cursor.execute("SELECT COUNT(*) FROM loans WHERE returned_at IS NOT NULL")
        returned_loans = cursor.fetchone()[0]
        print(f"📚 返却済み数: {returned_loans}")
        
        # 現在貸出中データ数
        cursor.execute("SELECT COUNT(*) FROM loans WHERE returned_at IS NULL")
        active_loans = cursor.fetchone()[0]
        print(f"🔄 貸出中数: {active_loans}")
        
        # 最近の返却データ（5件）
        cursor.execute("""
            SELECT l.id, u.username, b.title, l.borrowed_at, l.returned_at 
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.returned_at IS NOT NULL
            ORDER BY l.returned_at DESC
            LIMIT 5
        """)
        recent_returns = cursor.fetchall()
        
        print("\n📖 最近の返却データ（上位5件）:")
        if recent_returns:
            for loan in recent_returns:
                print(f"  ID:{loan[0]} | {loan[1]} | {loan[2]} | 返却日: {loan[4]}")
        else:
            print("  返却データがありません")
        
        # 2025年8月の返却データ
        cursor.execute("""
            SELECT COUNT(*) FROM loans 
            WHERE returned_at >= '2025-08-01' AND returned_at < '2025-09-01'
        """)
        august_returns = cursor.fetchone()[0]
        print(f"\n📅 2025年8月の返却数: {august_returns}")
        
        # 2025年8月の返却データ詳細
        cursor.execute("""
            SELECT u.username, b.title, l.returned_at 
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.returned_at >= '2025-08-01' AND l.returned_at < '2025-09-01'
            ORDER BY l.returned_at DESC
        """)
        august_details = cursor.fetchall()
        
        if august_details:
            print("詳細:")
            for loan in august_details:
                print(f"  {loan[0]} | {loan[1]} | {loan[2]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    print("=== データベース内容確認 ===")
    check_database_data() 