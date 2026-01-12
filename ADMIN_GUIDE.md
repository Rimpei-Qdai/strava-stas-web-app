# 管理者向け: ローカル環境でのデータ取得方法

本番環境ではVercelの10秒タイムアウト制限があるため、ユーザーのStravaデータ取得はローカル環境で管理者が行う必要があります。

## セットアップ

### 1. Python環境の準備

```bash
# Pythonパッケージのインストール
pip install python-dotenv supabase requests
```

### 2. 環境変数の設定

`.env.local`ファイルにSupabase認証情報が設定されていることを確認：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## データ取得手順

### 1. ユーザーがWebアプリでOAuth認証

ユーザーは本番環境（https://stravastas.vercel.app）でOAuth認証を完了します。
これにより、以下の情報がSupabaseの`tokens`テーブルに保存されます：

- Client ID
- Athlete ID
- Athlete Name
- Access Token
- Refresh Token
- Expires At

### 2. 管理者がローカルでデータ取得

ユーザーから以下の情報を取得：
- **Client ID**
- **Athlete ID**

これらはWebアプリのトークン一覧ページで確認できます。

### 3. スクリプト実行

```bash
cd get_tokens_web_app
python scripts/fetch_user_data.py <client_id> <athlete_id>
```

**例:**
```bash
python scripts/fetch_user_data.py 192607 80879326
```

### 4. Client Secretの入力

アクセストークンの有効期限が切れている場合、スクリプトがClient Secretの入力を求めます：

```
🔄 アクセストークンの有効期限が切れています。リフレッシュします...
Client Secret を入力してください: 
```

ユーザーからClient Secretを取得して入力してください。

### 5. データ取得の完了

スクリプトが以下の処理を自動で行います：

1. Stravaから2025年のアクティビティ一覧を取得
2. 各アクティビティの詳細データを取得（必要な場合のみ）
3. コメント、KOM、セグメント情報を集計
4. 統計データをSupabaseの`stats`テーブルに保存

完了すると、Webアプリの統計ページにデータが表示されます。

## トラブルシューティング

### トークンが見つからない

```
❌ トークンが見つかりません: client_id=xxx, athlete_id=xxx
```

→ ユーザーがWebアプリでOAuth認証を完了していません。先に認証を完了してください。

### トークンリフレッシュエラー

```
トークンリフレッシュエラー: 400 - Bad Request
```

→ Client Secretが間違っている可能性があります。正しいClient Secretを入力してください。

### API制限エラー

Stravaは以下のレート制限があります：
- 15分あたり600リクエスト
- 1日あたり100,000リクエスト

制限に達した場合は時間をおいて再実行してください。

## 出力例

```
🚀 データ取得開始: client_id=192607, athlete_id=80879326

📝 トークン情報を取得中...
✅ アスリート: Rimpei Haty

📅 取得期間: 2025-01-01 〜 2026-01-13

📥 アクティビティ一覧を取得中...
📥 ページ 1 を取得中... (1ページあたり最大200件)
   146件取得 (累計: 146件)
✅ 合計 146 件のアクティビティを取得しました

📊 146件のアクティビティを処理中...
   基本処理: 50/146
   基本処理: 100/146
   基本処理: 146/146

🔍 詳細取得が必要: 47件
   詳細取得: 10/47
   詳細取得: 20/47
   詳細取得: 30/47
   詳細取得: 40/47

📊 統計サマリー:
   総距離: 11089.8 km
   アクティビティ数: 146
   コメント数: 29
   KOM数: 0
   通過セグメント数: 156

💾 データベースに保存中...
✅ 統計データを保存しました

🎉 完了しました！
```

## 定期的な更新

新しいアクティビティが追加された場合、同じコマンドを再実行することでデータを更新できます：

```bash
python scripts/fetch_user_data.py <client_id> <athlete_id>
```

スクリプトは常に2025年の全データを取得し、最新の統計で上書きします。
