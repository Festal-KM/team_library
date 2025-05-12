from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Stats API"}

@app.get("/api/stats/dashboard")
def get_dashboard_stats():
    logger.info("Dashboard stats requested")
    return {
        "total_books": 6,
        "available_books": 0,
        "overdue_books": 0,
        "pending_requests": 1
    }

@app.get("/api/debug/book-status")
def debug_book_status():
    logger.info("Debug book status requested")
    return [
        {
            "id": 1,
            "title": "リーダブルコード",
            "status": "borrowed",
            "borrower_id": 2,
            "reservations_count": 0
        },
        {
            "id": 2,
            "title": "達人プログラマー",
            "status": "borrowed",
            "borrower_id": 1,
            "reservations_count": 1
        },
        {
            "id": 3,
            "title": "Clean Architecture",
            "status": "borrowed",
            "borrower_id": 3,
            "reservations_count": 0
        },
        {
            "id": 4,
            "title": "オブジェクト指向設計実践ガイド",
            "status": "borrowed",
            "borrower_id": 2,
            "reservations_count": 0
        },
        {
            "id": 5,
            "title": "エンジニアのためのドメイン駆動設計入門",
            "status": "borrowed",
            "borrower_id": 3,
            "reservations_count": 0
        },
        {
            "id": 6,
            "title": "Real World HTTP",
            "status": "borrowed",
            "borrower_id": 1,
            "reservations_count": 0
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 