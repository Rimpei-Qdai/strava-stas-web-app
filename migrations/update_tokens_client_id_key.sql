-- スキーマ更新: tokensテーブルをclient_idを主キーに変更
-- Supabaseダッシュボードの SQL Editor で実行してください

-- 既存のtokensテーブルを削除（データが消えます！バックアップを取ってから実行）
DROP TABLE IF EXISTS tokens CASCADE;

-- 新しいtokensテーブルを作成
CREATE TABLE tokens (
  client_id VARCHAR(255) PRIMARY KEY,
  athlete_id BIGINT NOT NULL,
  athlete_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  client_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  athlete_profile JSONB
);

-- インデックス
CREATE INDEX idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX idx_tokens_athlete_id ON tokens(athlete_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーが読み書きできるポリシー（開発用）
CREATE POLICY "Enable all access for all users" ON tokens
  FOR ALL USING (true);
