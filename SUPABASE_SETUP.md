# Supabase セットアップガイド

## 1. Supabaseプロジェクトを作成

1. https://supabase.com/ にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン
4. 「New Project」をクリック
5. 以下を入力：
   - **Name**: strava-data-tool（任意）
   - **Database Password**: 強力なパスワードを生成（保存しておく）
   - **Region**: Northeast Asia (Tokyo) を選択
   - **Pricing Plan**: Free を選択
6. 「Create new project」をクリック（数分かかります）

## 2. データベーステーブルを作成

1. Supabaseダッシュボードで「SQL Editor」を開く
2. 「+ New query」をクリック
3. `schema.sql` の内容をコピー＆ペースト
4. 「Run」をクリック
5. 成功メッセージが表示されればOK

## 3. API認証情報を取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 4. 環境変数を設定

`.env.local` ファイルに以下を追加：

```env
# Strava API（既存）
STRAVA_CLIENT_ID=192607
STRAVA_CLIENT_SECRET=xxxxx
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/callback

# Supabase（新規追加）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. 動作確認

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き、Stravaアカウントを登録してみてください。

## 6. Vercelにデプロイ

1. Vercelダッシュボードを開く
2. プロジェクトの「Settings」→「Environment Variables」
3. 以下を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 「Save」をクリック
5. 「Deployments」→「Redeploy」

## 7. データの確認方法

### Supabaseダッシュボードで確認

1. 「Table Editor」を開く
2. テーブルを選択：
   - `tokens`: 登録されたユーザー
   - `stats`: 統計データ
   - `fetch_status`: データ取得状況

### SQLクエリで確認

```sql
-- 全トークンを確認
SELECT athlete_id, athlete_name, expires_at FROM tokens;

-- 全統計を確認
SELECT athlete_id, data->>'total_distance' as distance, updated_at FROM stats;

-- データ取得状況を確認
SELECT * FROM fetch_status WHERE status = 'fetching';
```

## トラブルシューティング

### エラー: "relation does not exist"
→ `schema.sql` を実行していない可能性があります。SQL Editorで再実行してください。

### エラー: "Invalid API key"
→ `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認してください。

### データが保存されない
→ Row Level Security (RLS) のポリシーを確認してください。開発中は `schema.sql` のポリシーで全アクセス許可しています。

## セキュリティ注意事項

現在のRLSポリシーは**全ユーザーがアクセス可能**です。本番環境では以下のように変更してください：

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable all access for all users" ON tokens;
DROP POLICY IF EXISTS "Enable all access for all users" ON stats;
DROP POLICY IF EXISTS "Enable all access for all users" ON fetch_status;

-- 認証されたユーザーのみアクセス可能にする
CREATE POLICY "Authenticated users can access" ON tokens
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access" ON stats
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access" ON fetch_status
  FOR ALL USING (auth.role() = 'authenticated');
```
