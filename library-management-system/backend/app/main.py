from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import books, users, loans, reservations, purchase_requests

app = FastAPI(title="蔵書管理システム API")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # フロントエンドのURL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(books.router, prefix="/api/books", tags=["books"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(loans.router, prefix="/api/loans", tags=["loans"])
app.include_router(reservations.router, prefix="/api/reservations", tags=["reservations"])
app.include_router(purchase_requests.router, prefix="/api/purchase-requests", tags=["purchase-requests"])

@app.get("/")
async def root():
    return {"message": "蔵書管理システム API へようこそ！"} 