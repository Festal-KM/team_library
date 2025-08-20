#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db_session
from app.models.user import User

def main():
    with get_db_session() as db:
        users = db.query(User).all()
        print("現在のユーザー一覧:")
        print("-" * 80)
        for user in users:
            print(f'ID: {user.id:<3} | Name: {user.full_name:<20} | Email: {user.email:<30} | Role: {user.role}')
        print("-" * 80)
        print(f"Total: {len(users)} users")

if __name__ == "__main__":
    main() 