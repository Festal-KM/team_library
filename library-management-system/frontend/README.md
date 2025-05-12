# 蔵書管理システム フロントエンド

社内蔵書管理システムのフロントエンドアプリケーションです。書籍の閲覧、貸出、予約、購入申請などの機能を提供します。

## 技術スタック

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- React Query (データフェッチング)
- React Hook Form (フォーム管理)
- Axios (API通信)
- date-fns (日付処理)
- Heroicons、Lucide React (アイコン)

## セットアップ方法

### 前提条件

- Node.js 18.0.0以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install
# または
yarn install
```

### 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
```

アプリケーションは http://localhost:3000 で起動します。

## 主要なページ

### ダッシュボード（トップページ）
- `/`: 新着書籍、貸出中の書籍、予約中の書籍、購入申請などを表示

### 書籍関連
- `/books`: 書籍一覧（検索・フィルター機能付き）
- `/books/[id]`: 書籍詳細ページ

### マイページ
- `/mypage`: ユーザーの貸出・予約・申請状況など

### 購入申請
- `/purchase-requests`: 購入申請一覧
- `/purchase-requests/new`: 新規購入申請ページ
- `/purchase-requests/[id]`: 購入申請詳細ページ

### 管理者ページ
- `/admin/books`: 書籍管理（管理者用）
- `/admin/users`: ユーザー管理（管理者用）
- `/admin/purchase-requests`: 購入申請管理（管理者・承認者用）

## 主要コンポーネント

### 書籍関連
- BookCard: 書籍のカード表示
- BookGrid: 書籍一覧のグリッド表示
- BookSearchFilters: 書籍検索フィルター
- BorrowButton: 貸出ボタン
- ReserveButton: 予約ボタン

### ダッシュボード
- DashboardStats: 統計情報表示
- RecentlyAddedBooks: 新着書籍
- MyBooksSection: 貸出中の書籍セクション
- MyReservationsSection: 予約中の書籍セクション
- MyRequestsSection: 購入申請セクション

### レイアウト
- Header: ヘッダーコンポーネント（ナビゲーション含む）
- Footer: フッターコンポーネント

## デモについて

このフロントエンドは、`http://localhost:8000` で動作するバックエンドAPIと通信することを想定しています。バックエンドサーバーを先に起動してから、フロントエンドを起動してください。

### デモ用の簡略化
- 認証システムは実装せず、ヘッダーでユーザーを切り替えられるようにしています
- メール通知は実装せず、画面上の通知のみ実装しています
- バーコードスキャンは実装していません

### ユーザー切り替え
ヘッダー右上のユーザーアイコンをクリックすると、次のユーザー間で切り替えができます：
- 山田太郎（一般ユーザー）
- 佐藤花子（一般ユーザー）
- 鈴木一郎（承認者）
- 管理者（管理者） 