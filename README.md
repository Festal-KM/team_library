# チーム蔵書管理システム

## 概要
このシステムは、チームや小規模組織向けの蔵書管理システムです。書籍の検索、貸出管理、予約、購入リクエストなどの機能を提供します。

## システム構成
- **バックエンド**: Python + FastAPI
- **フロントエンド**: Next.js + TypeScript + Tailwind CSS

## 主な機能
- 蔵書一覧表示と検索
- 書籍の貸出・返却管理
- 書籍の予約機能
- 購入リクエスト機能
- 管理者向け承認ワークフロー

## インストール方法

### バックエンド
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

## 開発履歴
- 2024-01: プロジェクト開始
- 2024-03: 基本機能実装
- 2024-05: UI改善、Amazon検索機能追加

## ライセンス
MIT License 