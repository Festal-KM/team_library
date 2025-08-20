#!/usr/bin/env python3
from src.models.base import get_db
from src.models.purchase_request import PurchaseRequest

def check_amazon_data():
    db = next(get_db())
    
    try:
        # 最新のいくつかの購入申請を取得
        requests = db.query(PurchaseRequest).order_by(PurchaseRequest.id.desc()).limit(5).all()
        
        print("=== 購入申請のAmazon URL情報 ===")
        for request in requests:
            print(f"\nID: {request.id}")
            print(f"Title: {request.title}")
            print(f"User ID: {request.user_id}")
            
            # 全ての属性を確認
            attrs = ['url', 'amazon_url', 'image_url', 'description']
            for attr in attrs:
                if hasattr(request, attr):
                    value = getattr(request, attr)
                    print(f"{attr}: {value}")
                else:
                    print(f"{attr}: (属性なし)")
            print("-" * 50)
            
        # データベースのテーブル構造も確認
        print("\n=== データベーステーブル構造 ===")
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        columns = inspector.get_columns('purchase_requests')
        
        print("purchase_requests テーブルのカラム:")
        for column in columns:
            print(f"  {column['name']}: {column['type']}")
    
    finally:
        db.close()

if __name__ == "__main__":
    check_amazon_data() 