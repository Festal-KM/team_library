#!/usr/bin/env python
import json
import logging
import random
import uvicorn
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="図書館管理システム - 予約専用API")

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 予約リクエストのモデル
class ReservationRequest(BaseModel):
    book_id: int
    user_id: int

# レスポンス用モデル
class ReservationResponse(BaseModel):
    reservation_id: int
    book_id: int
    user_id: int
    reserved_at: str
    status: str
    message: str

# 簡易的なデータストア
reservations: Dict[int, Dict[str, Any]] = {}
reservation_count: Dict[int, int] = {}

# BOOKS名前マッピング（メインサーバーと同じ書籍情報にアクセスできないため、シンプルなマッピングを作成）
BOOK_TITLES = {
    1: "リーダブルコード",
    2: "達人プログラマー",
    3: "Clean Architecture",
    4: "オブジェクト指向設計実践ガイド",
    5: "エンジニアのためのドメイン駆動設計入門",
    6: "Real World HTTP"
}

BOOK_IMAGES = {
    1: "/images/readable-code.jpg",
    2: "/images/pragmatic-programmer.jpg",
    3: "/images/clean-architecture.jpg",
    4: "/images/practical-object-oriented-design.jpg",
    5: "/images/domain-driven-design.jpg", 
    6: "/images/real-world-http.jpg"
}

# 予約を作成するエンドポイント - 入力チェックを追加
@app.post("/api/reservations", response_model=ReservationResponse)
async def create_reservation(data: ReservationRequest):
    logger.info(f"予約リクエスト受信: {data.dict()}")
    
    book_id = data.book_id
    user_id = data.user_id
    
    # デバッグログ追加
    logger.info(f"現在の予約数: {len(reservations)}, 予約内容: {reservations}")
    
    # 既存の予約をチェック（同じユーザーが同じ本を既に予約していないか）
    has_active_reservation = False
    for reservation in reservations.values():
        if (reservation["book_id"] == book_id and 
            reservation["user_id"] == user_id and 
            reservation["status"] == "active"):
            has_active_reservation = True
            logger.info(f"既に予約済みの本です: user_id={user_id}, book_id={book_id}, reservation_id={reservation['reservation_id']}")
            return ReservationResponse(
                reservation_id=reservation["reservation_id"],
                book_id=book_id,
                user_id=user_id,
                reserved_at=reservation["reserved_at"],
                status=reservation["status"],
                message="この本は既に予約済みです"
            )
    
    logger.info(f"既存の予約チェック結果: {has_active_reservation}")
    
    # 予約IDを生成
    reservation_id = len(reservations) + 1
    
    # 予約を記録
    reservation = {
        "reservation_id": reservation_id,
        "book_id": book_id,
        "user_id": user_id,
        "reserved_at": datetime.now().isoformat(),
        "status": "active"
    }
    
    reservations[reservation_id] = reservation
    
    # 書籍の予約カウントを更新
    if book_id not in reservation_count:
        reservation_count[book_id] = 0
    reservation_count[book_id] += 1
    
    logger.info(f"予約が正常に作成されました: {reservation}")
    
    return ReservationResponse(
        reservation_id=reservation_id,
        book_id=book_id,
        user_id=user_id,
        reserved_at=reservation["reserved_at"],
        status=reservation["status"],
        message="予約が正常に作成されました"
    )

# 予約をキャンセルするエンドポイント
@app.post("/api/reservations/cancel")
async def cancel_reservation(reservation_id: int = Body(..., embed=True)):
    logger.info(f"予約キャンセルリクエスト受信: reservation_id={reservation_id}")
    
    if reservation_id not in reservations:
        logger.error(f"予約が見つかりません: reservation_id={reservation_id}")
        raise HTTPException(status_code=404, detail="予約が見つかりません")
    
    reservation = reservations[reservation_id]
    
    if reservation["status"] != "active":
        logger.error(f"この予約は既にキャンセルまたは完了しています: reservation_id={reservation_id}")
        raise HTTPException(status_code=400, detail="この予約は既にキャンセルまたは完了しています")
    
    # 予約をキャンセル状態に更新
    reservation["status"] = "cancelled"
    
    # 書籍の予約カウントを更新
    book_id = reservation["book_id"]
    if book_id in reservation_count and reservation_count[book_id] > 0:
        reservation_count[book_id] -= 1
    
    logger.info(f"予約がキャンセルされました: reservation_id={reservation_id}")
    
    return {
        "message": "予約がキャンセルされました",
        "reservation_id": reservation_id
    }

# 予約キャンセルのための追加エンドポイント（フォーマットの違いに対応）
@app.post("/api/reservations/cancel/{reservation_id}")
async def cancel_reservation_path(reservation_id: int):
    logger.info(f"パスパラメータによる予約キャンセルリクエスト受信: reservation_id={reservation_id}")
    
    if reservation_id not in reservations:
        logger.error(f"予約が見つかりません: reservation_id={reservation_id}")
        raise HTTPException(status_code=404, detail="予約が見つかりません")
    
    reservation = reservations[reservation_id]
    
    if reservation["status"] != "active":
        logger.error(f"この予約は既にキャンセルまたは完了しています: reservation_id={reservation_id}")
        raise HTTPException(status_code=400, detail="この予約は既にキャンセルまたは完了しています")
    
    # 予約をキャンセル状態に更新
    reservation["status"] = "cancelled"
    
    # 書籍の予約カウントを更新
    book_id = reservation["book_id"]
    if book_id in reservation_count and reservation_count[book_id] > 0:
        reservation_count[book_id] -= 1
    
    logger.info(f"予約がキャンセルされました: reservation_id={reservation_id}")
    
    return {
        "message": "予約がキャンセルされました",
        "reservation_id": reservation_id
    }

# 予約数を取得するエンドポイント
@app.get("/api/books/{book_id}/reservations/count")
async def get_book_reservation_count(book_id: int):
    logger.info(f"書籍ID {book_id} の予約数を取得")
    count = reservation_count.get(book_id, 0)
    return {"book_id": book_id, "reservation_count": count}

# 予約キューを取得するエンドポイント
@app.get("/api/reservations/book/{book_id}/queue")
async def get_book_reservation_queue(book_id: int):
    logger.info(f"書籍ID {book_id} の予約キューを取得")
    
    # この書籍の予約を集める
    book_reservations = [
        reservation for reservation in reservations.values()
        if reservation["book_id"] == book_id and reservation["status"] == "active"
    ]
    
    # ユーザー情報とタイトル情報を付加する
    for reservation in book_reservations:
        user_id = reservation["user_id"]
        reservation["user"] = {
            "id": user_id,
            "name": f"ユーザー{user_id}",
            "email": f"user{user_id}@example.com"
        }
        book_title = BOOK_TITLES.get(book_id, f"Book {book_id}")
        book_image = BOOK_IMAGES.get(book_id, "/images/domain-driven-design.jpg")
        reservation["book_title"] = book_title
        reservation["book_image"] = book_image
    
    return book_reservations

# 特定ユーザーの予約一覧を取得するエンドポイント
@app.get("/api/reservations/user/{user_id}")
async def get_user_reservations(user_id: int):
    logger.info(f"ユーザーID {user_id} の予約一覧を取得")
    
    # このユーザーに関連する予約を集める
    user_reservations = []
    for reservation in reservations.values():
        if reservation["user_id"] == user_id and reservation["status"] == "active":
            book_id = reservation["book_id"]
            # ダッシュボード用のフォーマットに変換
            user_reservation = {
                "reservation_id": reservation["reservation_id"],
                "book_id": book_id,
                "book_title": BOOK_TITLES.get(book_id, f"Book {book_id}"),  # 実際のタイトルを使用
                "book_image": BOOK_IMAGES.get(book_id, "/images/domain-driven-design.jpg"),  # 実際の画像パスを使用
                "reserved_at": reservation["reserved_at"],
                "status": reservation["status"]
            }
            user_reservations.append(user_reservation)
    
    logger.info(f"ユーザーID {user_id} の予約数: {len(user_reservations)}")
    return user_reservations

# サーバーが起動しているかのチェック用エンドポイント
@app.get("/api/message")
async def get_message():
    return {"message": "予約専用APIサーバーが正常に動作しています"}

if __name__ == "__main__":
    logger.info("予約専用APIサーバーを起動します...")
    uvicorn.run(app, host="0.0.0.0", port=8002) 