"""
データベースベースモデル
"""
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from src.config.settings import settings

# SQLAlchemyベースクラス
Base = declarative_base()

# データベースエンジン
# psycopg (新バージョン) を使用するためのURL変換
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    database_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_recycle=300
)

# セッションメーカー
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class BaseModel(Base):
    """ベースモデルクラス"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def get_db():
    """データベースセッション取得"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """テーブル作成"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """テーブル削除"""
    Base.metadata.drop_all(bind=engine) 