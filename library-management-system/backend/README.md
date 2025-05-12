# 蔵書管理システム バックエンド

社内蔵書管理システムのバックエンドAPIです。書籍管理、貸出・返却、予約、購入申請などの機能を提供します。

## 技術スタック

- FastAPI: Webフレームワーク
- Pydantic: データバリデーション
- BeautifulSoup4: Amazonスクレイピング
- Requests: HTTP通信

## セットアップ方法

### 前提条件

- Python 3.9以上

### インストール

```bash
# 仮想環境の作成と有効化
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate

# 必要なパッケージのインストール
pip install -r requirements.txt
```

### 開発サーバーの起動

```bash
python run.py
```

サーバーは http://localhost:8000 で起動します。
API ドキュメントは http://localhost:8000/docs で確認できます。

## API エンドポイント

### 書籍関連

- `GET /api/books`: 書籍一覧を取得
  - クエリパラメータ: `title`, `author`, `category`, `available_only`
- `GET /api/books/{book_id}`: 書籍詳細を取得
- `POST /api/books`: 新しい書籍を登録（管理者のみ）
- `PUT /api/books/{book_id}`: 書籍を更新（管理者のみ）
- `DELETE /api/books/{book_id}`: 書籍を削除（管理者のみ）
- `GET /api/books/{book_id}/reservations/count`: 書籍の予約数を取得

### 貸出関連

- `GET /api/loans`: 貸出一覧を取得
  - クエリパラメータ: `user_id`, `book_id`, `active_only`
- `GET /api/loans/{loan_id}`: 貸出詳細を取得
- `POST /api/loans/borrow`: 書籍を借りる
- `POST /api/loans/return`: 書籍を返却する
- `GET /api/loans/user/{user_id}/active`: ユーザーの現在の貸出状況を取得
- `GET /api/loans/overdue`: 返却期限が過ぎた貸出を取得

### 予約関連

- `GET /api/reservations`: 予約一覧を取得
  - クエリパラメータ: `user_id`, `book_id`, `active_only`
- `GET /api/reservations/{reservation_id}`: 予約詳細を取得
- `POST /api/reservations`: 新しい予約を作成
- `POST /api/reservations/cancel`: 予約をキャンセル
- `GET /api/reservations/book/{book_id}/queue`: 特定の書籍の予約キューを取得
- `GET /api/reservations/user/{user_id}`: ユーザーの予約一覧を取得

### 購入申請関連

- `GET /api/purchase-requests`: 購入申請一覧を取得
  - クエリパラメータ: `user_id`, `status`
- `GET /api/purchase-requests/{request_id}`: 購入申請詳細を取得
- `POST /api/purchase-requests/amazon/info`: AmazonのURLから書籍情報を取得
- `POST /api/purchase-requests`: 新しい購入申請を作成
- `POST /api/purchase-requests/process`: 購入申請を承認または却下（承認者・管理者用）
- `POST /api/purchase-requests/purchased`: 承認された申請を購入済みに設定（管理者用）
- `GET /api/purchase-requests/pending`: 承認待ちの購入申請一覧を取得
- `GET /api/purchase-requests/user/{user_id}`: 特定のユーザーの購入申請履歴を取得

### ユーザー関連

- `GET /api/users`: ユーザー一覧を取得
  - クエリパラメータ: `role`
- `GET /api/users/{user_id}`: ユーザー詳細を取得
- `POST /api/users`: 新しいユーザーを作成（管理者のみ）
- `PUT /api/users/{user_id}`: ユーザー情報を更新（管理者のみ）
- `DELETE /api/users/{user_id}`: ユーザーを削除（管理者のみ）
- `GET /api/users/{user_id}/stats`: ユーザーの利用統計を取得
- `GET /api/users/roles`: 利用可能なユーザーロール一覧を取得

## データモデル

### 書籍 (Book)

```
{
  "id": int,
  "title": string,
  "author": string,
  "publisher": string | null,
  "isbn": string | null,
  "price": float | null,
  "page_count": int | null,
  "cover_image": string | null,
  "description": string | null,
  "category": string | null,
  "added_at": datetime,
  "is_available": boolean,
  "current_borrower_id": int | null
}
```

### 貸出 (Loan)

```
{
  "id": int,
  "book_id": int,
  "user_id": int,
  "borrowed_at": datetime,
  "due_date": datetime,
  "returned_at": datetime | null,
  "is_returned": boolean
}
```

### 予約 (Reservation)

```
{
  "id": int,
  "book_id": int,
  "user_id": int,
  "reserved_at": datetime,
  "position": int,
  "is_active": boolean
}
```

### 購入申請 (PurchaseRequest)

```
{
  "id": int,
  "user_id": int,
  "amazon_url": string,
  "title": string,
  "author": string,
  "publisher": string | null,
  "isbn": string | null,
  "price": float | null,
  "cover_image": string | null,
  "description": string | null,
  "reason": string,
  "status": "pending" | "approved" | "rejected" | "purchased",
  "created_at": datetime,
  "approved_at": datetime | null,
  "approver_id": int | null,
  "purchase_date": datetime | null
}
```

### ユーザー (User)

```
{
  "id": int,
  "name": string,
  "email": string,
  "role": "user" | "approver" | "admin"
}
```

## デモについて

このバックエンドは、実際のデータベースの代わりにインメモリデータストア（JSONファイル）を使用しています。サーバー再起動時にデータはリセットされます。 