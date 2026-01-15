# 🚴 Strava Stats Web App

複数ユーザーのStravaトークンを取得・管理し、Pythonスクリプトでデータを取得・可視化するWebアプリケーション（Next.js + TypeScript + Python）

## 🌟 機能

### TypeScript (Next.js) 側
- Strava OAuth認証フロー
- 複数ユーザーのトークン管理（アクセストークン、リフレッシュトークン）
- トークンの有効期限表示
- トークンの削除機能
- Supabaseへのトークン保存
- 統計データの可視化（グラフ表示）

### Python側
- Strava APIからのアクティビティデータ取得
- 統計情報の計算と集計
- Supabaseへのデータ保存

## 🔄 ワークフロー

1. **Webアプリでトークン取得**: ユーザーがWebアプリでOAuth認証を実行し、トークンをSupabaseに保存
2. **Pythonスクリプトでデータ取得**: ローカル環境でPythonスクリプトを実行し、Stravaからデータを取得してSupabaseに保存
3. **Webアプリで可視化**: Webアプリで保存された統計データを可視化して表示

## 📁 プロジェクト構成

```
strava-stats-web-app/
├── app/
│   ├── api/
│   │   ├── auth/route.ts        # OAuth認証開始
│   │   ├── callback/route.ts    # OAuth コールバック
│   │   ├── tokens/route.ts      # トークン管理API
│   │   └── stats/route.ts       # 統計データ取得API
│   ├── stats/page.tsx           # 統計ダッシュボード
│   ├── page.tsx                 # メインページ（トークン管理）
│   └── layout.tsx               # レイアウト
├── lib/
│   ├── types.ts                 # TypeScript型定義
│   ├── database.ts              # Supabaseデータベース操作
│   ├── tokenManager.ts          # トークン管理ロジック
│   └── stravaDataFetcher.ts     # Stravaデータ取得（未使用）
├── scripts/
│   └── fetch_user_data.py       # データ取得Pythonスクリプト
├── schema.sql                   # データベーススキーマ
└── .env.local                   # 環境変数
```

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
# Node.js依存関係
npm install

# Python依存関係
pip install -r requirements.txt  # または pipenv install
```

### 2. Supabaseのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. `schema.sql` をSupabase SQL Editorで実行してテーブルを作成
3. プロジェクトのURLと匿名キーを取得

### 3. 環境変数の設定

`.env.local` を作成：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Next.js
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/callback
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## 📝 使い方

### ステップ1: トークンの取得（Webアプリ）

1. Webアプリ (http://localhost:3000) にアクセス
2. 「Stravaアカウントを登録する」ボタンをクリック
3. Client IDとClient Secretを入力（各ユーザーが個別に持つ）
4. Stravaで認証を完了
5. トークンが自動的にSupabaseに保存される

### ステップ2: データの取得（Pythonスクリプト）

```bash
cd scripts
python fetch_user_data.py
```

このスクリプトは：
- Supabaseから全トークンを取得
- 各ユーザーのStravaデータを取得
- 統計情報を計算
- 結果をSupabaseに保存

### ステップ3: データの可視化（Webアプリ）

1. Webアプリで「統計ダッシュボードを見る」をクリック
2. グラフやチャートで各ユーザーのデータを比較表示

## 🌐 Vercelへのデプロイ

### トークンの取得
### 1. Vercel CLIでデプロイ

```bash
npm install -g vercel
vercel
```

### 2. 環境変数の設定

Vercelダッシュボードで環境変数を設定：

- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名キー
- `NEXT_PUBLIC_REDIRECT_URI`: `https://your-app.vercel.app/api/callback`

### 3. 本番デプロイ

```bash
vercel --prod
```

## 🔧 API エンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/auth` | GET | Strava OAuth認証開始 |
| `/api/callback` | GET | OAuth コールバック |
| `/api/tokens` | GET | 全トークン一覧取得 |
| `/api/tokens` | DELETE | トークン削除 |
| `/api/stats` | GET | 統計データ取得 |

## 🐍 Pythonスクリプトの詳細

### fetch_user_data.py

Supabaseに保存されたトークンを使用して、Stravaからデータを取得します。

**主な機能：**
- トークンの自動リフレッシュ
- 2025年のアクティビティデータ取得
- コメント、セグメント、KOM情報の取得
- 統計情報の自動計算
- Supabaseへの保存

**実行方法：**
```bash
cd scripts
python fetch_user_data.py
```

**環境変数（.env または環境変数として設定）：**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

## 🔒 セキュリティ

- トークンはSupabaseに暗号化して保存
- `.env.local` は `.gitignore` に追加済み
- Client SecretはOAuth認証時のみ使用
- 本番環境では必ずHTTPSを使用

## 📚 技術スタック

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Chart.js, react-chartjs-2
- **Database**: Supabase (PostgreSQL)
- **Data Fetching**: Python 3.x
- **Deployment**: Vercel
- **API**: Strava OAuth2 & REST API

## 📄 ライセンス

MIT License