"""
データベース接続設定
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from src.config.settings import Settings

settings = Settings()

# データベースエンジン作成
engine = create_engine(
    settings.database_url,
    echo=settings.DEBUG,  # SQLログ出力（デバッグ時のみ）
    pool_pre_ping=True,   # 接続の健全性チェック
    pool_recycle=3600     # 1時間で接続をリサイクル
)

# セッションファクトリー作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """データベースセッションを取得"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_session() -> Session:
    """データベースセッションを直接取得（スクリプト用）"""
    return SessionLocal() 