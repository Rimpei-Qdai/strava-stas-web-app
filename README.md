# 🚴 Strava Token Web App

複数ユーザーのStravaトークンを取得・管理するWebアプリケーション（Next.js + TypeScript）

## 🌟 機能

- Strava OAuth認証フロー
- 複数ユーザーのトークン管理
- トークンの自動保存（JSON形式）
- トークンの有効期限表示
- トークンの削除機能
- Vercelでの簡単デプロイ

## 📁 プロジェクト構成

```
get_tokens_web_app/
├── app/
│   ├── api/
│   │   ├── auth/route.ts        # OAuth認証開始
│   │   ├── callback/route.ts    # OAuth コールバック
│   │   └── tokens/route.ts      # トークン管理API
│   ├── page.tsx                 # メインページ
│   └── layout.tsx               # レイアウト
├── lib/
│   ├── types.ts                 # TypeScript型定義
│   └── tokenManager.ts          # トークン管理ロジック
├── data/
│   └── tokens/                  # トークン保存先
├── .env.local                   # 環境変数（ローカル）
├── .env.local.example           # 環境変数テンプレート
└── vercel.json                  # Vercel設定
```

## 🚀 ローカル開発

### 1. 依存関係のインストール

```bash
cd get_tokens_web_app
npm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```env
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/callback
```

### 3. Strava API設定

https://www.strava.com/settings/api にアクセスして：

- **Authorization Callback Domain** に `localhost` を追加（開発用）
- 本番デプロイ後は `your-app.vercel.app` も追加

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## 🌐 Vercelへのデプロイ

### 1. Vercel CLIでデプロイ

```bash
npm install -g vercel
cd get_tokens_web_app
vercel
```

### 2. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：

- `STRAVA_CLIENT_ID`: あなたのStravaクライアントID
- `STRAVA_CLIENT_SECRET`: あなたのStravaクライアントシークレット
- `NEXT_PUBLIC_REDIRECT_URI`: `https://your-app.vercel.app/api/callback`

### 3. Strava APIの更新

https://www.strava.com/settings/api で：

- **Authorization Callback Domain** に `your-app.vercel.app` を追加

### 4. 再デプロイ

```bash
vercel --prod
```

## 📝 使い方

### トークンの取得

1. アプリにアクセス
2. 「Stravaで認証する」ボタンをクリック
3. Stravaアカウントでログイン
4. アプリを承認
5. 自動的にトークンが保存される

### 複数ユーザーの追加

- 各ユーザーが同じフローで認証
- トークンは個別に保存される
- ファイル名: `{athlete_id}_{athlete_name}.json`

### トークンの利用

保存されたトークンは `data/tokens/` ディレクトリに保存されます：

```json
{
  "athlete_id": 12345678,
  "athlete_name": "Taro Yamada",
  "access_token": "xxxxx",
  "refresh_token": "xxxxx",
  "expires_at": 1234567890,
  "created_at": "2025-12-31T12:00:00.000Z",
  "athlete_profile": {
    "id": 12345678,
    "firstname": "Taro",
    "lastname": "Yamada",
    ...
  }
}
```

## 🔧 API エンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/auth` | GET | Strava OAuth認証開始 |
| `/api/callback` | GET | OAuth コールバック |
| `/api/tokens` | GET | 全トークン一覧取得 |
| `/api/tokens` | DELETE | トークン削除 |

## 📊 他のスクリプトからトークンを使用

```typescript
import fs from 'fs';
import path from 'path';

// トークンを読み込む
const tokensDir = path.join(process.cwd(), 'get_tokens_web_app', 'data', 'tokens');
const files = fs.readdirSync(tokensDir);

for (const file of files) {
  if (file.endsWith('.json')) {
    const tokenData = JSON.parse(
      fs.readFileSync(path.join(tokensDir, file), 'utf-8')
    );
    
    // Strava APIを使用
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    const activities = await response.json();
    console.log(`${tokenData.athlete_name}:`, activities.length, 'activities');
  }
}
```

## 🔒 セキュリティ

- `.env.local` は `.gitignore` に追加済み
- `data/tokens/` ディレクトリも `.gitignore` に追加済み
- トークンは外部に公開しないでください
- 本番環境では必ずHTTPSを使用してください

## ⚠️ 注意事項

### Vercelでのファイルシステム

Vercelは読み取り専用のファイルシステムを使用するため、`data/tokens/` ディレクトリへのファイル書き込みは**本番環境では動作しません**。

**解決策：**

1. **データベースを使用**（推奨）
   - Vercel Postgres
   - MongoDB Atlas
   - Supabase
   
2. **Vercel KVストアを使用**
   ```bash
   npm install @vercel/kv
   ```

3. **外部ストレージを使用**
   - AWS S3
   - Google Cloud Storage

本番環境では、`lib/tokenManager.ts` を修正してデータベースまたはKVストアを使用してください。

## 🛠️ トラブルシューティング

### "Authorization Error"
- Strava APIの設定でコールバックURLが正しく設定されているか確認

### "config_error"
- `.env.local` ファイルが正しく設定されているか確認
- Vercelの環境変数が設定されているか確認

### トークンが保存されない
- `data/tokens/` ディレクトリの書き込み権限を確認
- Vercelデプロイの場合は、データベースまたはKVストアの使用を検討

## 📚 技術スタック

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **API**: Strava OAuth2

## 📄 ライセンス

MIT License
