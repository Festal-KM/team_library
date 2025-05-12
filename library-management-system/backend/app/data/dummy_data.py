from datetime import datetime, timedelta
from app.models.models import User, Book, Loan, Reservation, PurchaseRequest, UserRole, PurchaseRequestStatus

# ダミーユーザー
users = [
    User(
        id=1,
        name="山田太郎",
        email="yamada@example.com",
        role=UserRole.USER
    ),
    User(
        id=2,
        name="佐藤花子",
        email="sato@example.com",
        role=UserRole.USER
    ),
    User(
        id=3, 
        name="鈴木一郎",
        email="suzuki@example.com",
        role=UserRole.APPROVER
    ),
    User(
        id=4,
        name="管理者",
        email="admin@example.com",
        role=UserRole.ADMIN
    )
]

# ダミー書籍
books = [
    Book(
        id=1,
        title="Pythonによるデータ分析入門",
        author="Wes McKinney",
        publisher="オライリージャパン",
        isbn="9784873118451",
        price=4180,
        page_count=592,
        cover_image="https://m.media-amazon.com/images/I/91bUvXaEBpL._SL1500_.jpg",
        description="Pythonを使ったデータ分析のための実践的ガイド。データ操作、クリーニング、変換から可視化まで、幅広くカバー。",
        category="プログラミング",
        added_at=datetime.now() - timedelta(days=60),
        is_available=True
    ),
    Book(
        id=2,
        title="リーダブルコード",
        author="Dustin Boswell",
        publisher="オライリージャパン",
        isbn="9784873115658",
        price=2640,
        page_count=260,
        cover_image="https://m.media-amazon.com/images/I/91FZOB7ypQL._SL1500_.jpg",
        description="より良いコードを書くための実践的なテクニックを紹介。可読性の高いコードを書くための原則とパターン。",
        category="プログラミング",
        added_at=datetime.now() - timedelta(days=45),
        is_available=False,
        current_borrower_id=1
    ),
    Book(
        id=3,
        title="Clean Architecture",
        author="Robert C. Martin",
        publisher="KADOKAWA",
        isbn="9784048930659",
        price=4400,
        page_count=448,
        cover_image="https://m.media-amazon.com/images/I/91p2u+I+MaL._SL1500_.jpg",
        description="ソフトウェア設計の原則とパターンについて解説。保守性が高く、拡張性のあるアーキテクチャを構築するための指針。",
        category="プログラミング",
        added_at=datetime.now() - timedelta(days=30),
        is_available=True
    ),
    Book(
        id=4,
        title="エンジニアのためのデータ可視化入門",
        author="小林 茂",
        publisher="技術評論社",
        isbn="9784297104337",
        price=2860,
        page_count=320,
        cover_image="https://m.media-amazon.com/images/I/71dJmAuAI3L._SL1499_.jpg",
        description="データを効果的に可視化するための基本概念とテクニックを解説。",
        category="データサイエンス",
        added_at=datetime.now() - timedelta(days=20),
        is_available=True
    ),
    Book(
        id=5,
        title="Dockerコンテナ開発・環境構築の基本",
        author="馬場 正人",
        publisher="ソシム",
        isbn="9784802612722",
        price=3520,
        page_count=256,
        cover_image="https://m.media-amazon.com/images/I/71qNPkbKIfL._SL1500_.jpg",
        description="Dockerを使ったコンテナ環境の構築と開発の基本を解説。実践的なサンプルを交えて説明。",
        category="インフラ",
        added_at=datetime.now() - timedelta(days=15),
        is_available=False,
        current_borrower_id=2
    )
]

# ダミー貸出記録
loans = [
    Loan(
        id=1,
        book_id=2,
        user_id=1,
        borrowed_at=datetime.now() - timedelta(days=5),
        due_date=datetime.now() + timedelta(days=9),
        is_returned=False
    ),
    Loan(
        id=2,
        book_id=5,
        user_id=2,
        borrowed_at=datetime.now() - timedelta(days=3),
        due_date=datetime.now() + timedelta(days=11),
        is_returned=False
    ),
    Loan(
        id=3,
        book_id=1,
        user_id=3,
        borrowed_at=datetime.now() - timedelta(days=20),
        due_date=datetime.now() - timedelta(days=6),
        returned_at=datetime.now() - timedelta(days=8),
        is_returned=True
    )
]

# ダミー予約
reservations = [
    Reservation(
        id=1,
        book_id=2,
        user_id=3,
        reserved_at=datetime.now() - timedelta(days=2),
        position=1,
        is_active=True
    ),
    Reservation(
        id=2,
        book_id=2,
        user_id=4,
        reserved_at=datetime.now() - timedelta(days=1),
        position=2,
        is_active=True
    ),
    Reservation(
        id=3,
        book_id=5,
        user_id=1,
        reserved_at=datetime.now() - timedelta(hours=12),
        position=1,
        is_active=True
    )
]

# ダミー購入申請
purchase_requests = [
    PurchaseRequest(
        id=1,
        user_id=1,
        amazon_url="https://www.amazon.co.jp/dp/4873119979/",
        title="実践的Pythonプログラミング",
        author="Mark Lutz",
        publisher="オライリージャパン",
        isbn="9784873119977",
        price=4400,
        cover_image="https://m.media-amazon.com/images/I/71Da1-adADL._SL1500_.jpg",
        description="Pythonの実践的なプログラミングテクニックを解説。様々なアプリケーション開発のためのガイド。",
        reason="業務で必要なPythonの中級〜上級テクニックを学びたいため。",
        status=PurchaseRequestStatus.PENDING,
        created_at=datetime.now() - timedelta(days=3)
    ),
    PurchaseRequest(
        id=2,
        user_id=2,
        amazon_url="https://www.amazon.co.jp/dp/4295005495/",
        title="実践Rustプログラミング入門",
        author="初田直也",
        publisher="インプレス",
        isbn="9784295005490",
        price=3520,
        cover_image="https://m.media-amazon.com/images/I/91iHHYOofNL._SL1500_.jpg",
        description="Rustの基本から実践的な使い方までを解説した入門書。メモリ安全性と高パフォーマンスの両立について学ぶ。",
        reason="システムプログラミング言語の知識を深めるため。",
        status=PurchaseRequestStatus.APPROVED,
        created_at=datetime.now() - timedelta(days=10),
        approved_at=datetime.now() - timedelta(days=8),
        approver_id=3
    ),
    PurchaseRequest(
        id=3,
        user_id=3,
        amazon_url="https://www.amazon.co.jp/dp/4798167290/",
        title="AWSコンテナ設計・構築入門",
        author="大澤文孝",
        publisher="翔泳社",
        isbn="9784798167299",
        price=3190,
        cover_image="https://m.media-amazon.com/images/I/71Cud9C2JnL._SL1500_.jpg",
        description="AWSでのコンテナ環境の構築と運用について解説。ECS、EKS、Fargateなどのサービスの活用方法。",
        reason="クラウドネイティブなインフラ設計の知識を深めるため。",
        status=PurchaseRequestStatus.PURCHASED,
        created_at=datetime.now() - timedelta(days=30),
        approved_at=datetime.now() - timedelta(days=28),
        approver_id=3,
        purchase_date=datetime.now() - timedelta(days=25)
    )
]

# データのID採番用カウンター
counters = {
    "users": len(users) + 1,
    "books": len(books) + 1,
    "loans": len(loans) + 1,
    "reservations": len(reservations) + 1,
    "purchase_requests": len(purchase_requests) + 1
} 