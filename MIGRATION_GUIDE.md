# データベーススキーマ移行ガイド

## 概要
複数ユーザーが同じStrava アカウントで異なるAPIアプリケーションを使用できるように、データベーススキーマを変更しました。

## 変更内容
- 主キーを `athlete_id` から `(client_id, athlete_id)` の複合キーに変更
- すべてのテーブルに `client_id` カラムを追加

## 影響を受けるテーブル
1. `tokens`
2. `stats`
3. `fetch_status`

## 移行手順

### ステップ1: 既存データのバックアップ（重要）

移行を実行すると既存のデータが削除されます。必要に応じて、以下のSQLでバックアップを取得してください：

```sql
-- tokensテーブルのバックアップ
CREATE TABLE tokens_backup AS SELECT * FROM tokens;

-- statsテーブルのバックアップ
CREATE TABLE stats_backup AS SELECT * FROM stats;

-- fetch_statusテーブルのバックアップ
CREATE TABLE fetch_status_backup AS SELECT * FROM fetch_status;
```

### ステップ2: Supabaseダッシュボードにログイン

1. https://supabase.com/ にアクセス
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択

### ステップ3: 新しいスキーマを適用

`schema_updated.sql` の内容を SQL Editor にコピー&ペーストして実行してください。

```sql
-- 既存テーブルを削除して新しいスキーマで再作成
-- 注意: 既存のデータは削除されます

DROP TABLE IF EXISTS fetch_status CASCADE;
DROP TABLE IF EXISTS stats CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;

-- ... (schema_updated.sqlの内容をすべて実行)
```

### ステップ4: アプリケーションを再起動

```bash
cd get_tokens_web_app
npm run dev
```

### ステップ5: 動作確認

1. ブラウザで http://localhost:3000 を開く
2. 「🔐 Stravaアカウントを登録する」ボタンをクリック
3. Client IDとClient Secretを入力
4. 認証を完了してデータが正常に保存されることを確認

## トラブルシューティング

### エラー: "relation does not exist"
- Supabaseでスキーマが正しく実行されていない可能性があります
- SQL Editorで `schema_updated.sql` を再実行してください

### エラー: "onConflict: 'client_id,athlete_id'"
- 複合主キーのカラム名が一致していない可能性があります
- Supabaseのテーブル定義を確認してください

### データが上書きされる
- 新しいスキーマが正しく適用されていることを確認してください
- フロントエンドのコードが `client_id` を含めて送信しているか確認してください

## ロールバック方法

もし問題が発生した場合、以下のSQLでバックアップから復元できます：

```sql
-- 新しいテーブルを削除
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS stats CASCADE;
DROP TABLE IF EXISTS fetch_status CASCADE;

-- バックアップから復元
CREATE TABLE tokens AS SELECT * FROM tokens_backup;
CREATE TABLE stats AS SELECT * FROM stats_backup;
CREATE TABLE fetch_status AS SELECT * FROM fetch_status_backup;

-- インデックスと制約を再作成
ALTER TABLE tokens ADD PRIMARY KEY (athlete_id);
ALTER TABLE stats ADD PRIMARY KEY (athlete_id);
ALTER TABLE fetch_status ADD PRIMARY KEY (athlete_id);
```

注意: ロールバック後は、アプリケーションコードも以前のバージョンに戻す必要があります。

## 完了
スキーマ移行が完了しました。これで、複数のユーザーが同じStravaアカウントで異なるAPIアプリを使用してデータを登録できるようになります。
