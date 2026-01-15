# 📊 データ取得ガイド

## 🔄 変更点

以前は、TypeScript（Next.js）側でStravaからのデータ取得も行っていましたが、役割を分離しました：

### 新しいアーキテクチャ

```
┌─────────────────┐
│   Webアプリ     │  ← トークン管理 & データ可視化
│  (Next.js/TS)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │Supabase │  ← データ保存
    └────┬────┘
         │
┌────────▼────────┐
│ Pythonスクリプト│  ← データ取得
└─────────────────┘
```

### TypeScript側の役割
- ✅ OAuth認証によるトークン取得
- ✅ トークンの管理（表示・削除）
- ✅ 統計データの可視化（グラフ・チャート）
- ❌ Stravaからのデータ取得（削除）

### Python側の役割
- ✅ Supabaseからトークンを取得
- ✅ Strava APIからアクティビティデータを取得
- ✅ 統計情報の計算・集計
- ✅ Supabaseへの統計データ保存

## 🚀 データ取得の実行方法

### 1. トークンを登録（Webアプリ）

http://localhost:3000 にアクセスして、ユーザーのトークンを登録します。

### 2. Pythonスクリプトを実行

```bash
cd scripts
python fetch_user_data.py
```

### 3. 結果を確認（Webアプリ）

http://localhost:3000/stats にアクセスして、統計データを可視化表示します。

## 📝 Pythonスクリプトの設定

### 環境変数

`.env` ファイルを作成するか、環境変数を設定：

```bash
export SUPABASE_URL="your_supabase_url"
export SUPABASE_KEY="your_supabase_anon_key"
```

### 依存関係

```bash
pip install supabase requests python-dotenv
```

または

```bash
pip install -r requirements.txt
```

## 🔍 削除されたファイル

以下のファイルは、TypeScript側でのデータ取得機能が不要になったため削除されました：

- `app/api/fetch-data/route.ts` - データ取得APIエンドポイント
- `app/api/fetch-status/route.ts` - 取得進捗管理エンドポイント
- `app/api/reset-status/route.ts` - ステータスリセットエンドポイント

## 📋 変更されたファイル

### app/page.tsx
- データ更新ボタンを削除
- 進捗表示機能を削除
- `handleRefreshStats` 関数を削除
- トークン管理のみに専念

### app/api/stats/route.ts
- POSTメソッド（手動データ更新）を削除
- GETメソッド（データ表示）のみ残存

### README.md
- 新しいワークフローを反映
- Pythonスクリプトの説明を追加

## ✨ メリット

1. **責務の分離**: WebアプリはUI、Pythonはデータ処理に専念
2. **スケーラビリティ**: データ取得を独立したプロセスで実行可能
3. **柔軟性**: Pythonスクリプトをcronジョブやスケジューラーで自動実行可能
4. **デバッグの容易さ**: データ取得のエラーを独立して調査可能
5. **リソース効率**: Vercelのサーバーレス関数の実行時間制限を回避

## 🤔 よくある質問

### Q: なぜPythonとTypeScriptを分けるのか？

A: 
- Vercelのサーバーレス関数は実行時間制限がある（10秒〜60秒）
- Stravaからの大量データ取得は時間がかかる
- Pythonスクリプトは好きな環境で好きなだけ実行時間を確保できる

### Q: 自動的にデータを更新したい

A: Pythonスクリプトをcronジョブやタスクスケジューラーで定期実行してください：

```bash
# Linux/macOS (crontab)
# 毎日午前2時に実行
0 2 * * * cd /path/to/project/scripts && python fetch_user_data.py

# GitHub Actions（例）
# .github/workflows/fetch-data.yml を作成
```

### Q: データ取得の進捗を確認したい

A: Pythonスクリプトの実行ログを確認するか、`fetch_status` テーブルを監視してください。

### Q: 複数ユーザーのデータを並行取得したい

A: Pythonスクリプトを修正して、マルチスレッドやマルチプロセスで実行してください。

## 🔗 関連ドキュメント

- [README.md](README.md) - プロジェクト全体の説明
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - データベースのセットアップ
- [schema.sql](schema.sql) - データベーススキーマ
