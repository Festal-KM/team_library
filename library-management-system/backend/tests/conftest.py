"""
pytest設定とフィクスチャ
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.main import app
from src.models.base import Base
from src.database.connection import get_db
from src.models.user import User, UserRole
from src.models.book import Book, BookStatus
from src.utils.auth import get_password_hash


# テスト用インメモリデータベース
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def event_loop():
    """イベントループのフィクスチャ"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """テスト用データベースセッション"""
    # テーブル作成
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # テーブル削除
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """テスト用FastAPIクライアント"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client(db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """テスト用非同期クライアント"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session) -> User:
    """テスト用ユーザー"""
    user = User(
        username="testuser",
        full_name="テストユーザー",
        email="test@example.com",
        role=UserRole.USER,
        password_hash=get_password_hash("password123")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_admin(db_session: Session) -> User:
    """テスト用管理者"""
    admin = User(
        username="testadmin",
        full_name="テスト管理者",
        email="admin@example.com",
        role=UserRole.ADMIN,
        password_hash=get_password_hash("password123")
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def test_librarian(db_session: Session) -> User:
    """テスト用図書館員"""
    librarian = User(
        name="テスト図書館員",
        email="librarian@example.com",
        role=UserRole.LIBRARIAN,
        password_hash=get_password_hash("password123")
    )
    db_session.add(librarian)
    db_session.commit()
    db_session.refresh(librarian)
    return librarian


@pytest.fixture
def test_book(db_session: Session) -> Book:
    """テスト用書籍"""
    book = Book(
        title="テスト書籍",
        author="テスト著者",
        isbn="9784000000000",
        publisher="テスト出版社",
        published_year=2023,
        category="技術書",
        description="テスト用の書籍です",
        status=BookStatus.AVAILABLE
    )
    db_session.add(book)
    db_session.commit()
    db_session.refresh(book)
    return book


@pytest.fixture
def auth_headers(client: TestClient, test_user: User) -> dict:
    """認証ヘッダー（一般ユーザー）"""
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "password123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client: TestClient, test_admin: User) -> dict:
    """認証ヘッダー（管理者）"""
    response = client.post(
        "/api/auth/login",
        json={"email": test_admin.email, "password": "password123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def librarian_headers(client: TestClient, test_librarian: User) -> dict:
    """認証ヘッダー（図書館員）"""
    response = client.post(
        "/api/auth/login",
        json={"email": test_librarian.email, "password": "password123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"} 