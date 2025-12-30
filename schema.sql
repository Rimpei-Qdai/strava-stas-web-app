-- Supabaseのテーブル定義
-- Supabaseダッシュボードの SQL Editor で実行してください

-- トークンテーブル
CREATE TABLE IF NOT EXISTS tokens (
  athlete_id BIGINT PRIMARY KEY,
  athlete_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  athlete_profile JSONB
);

-- 統計テーブル
CREATE TABLE IF NOT EXISTS stats (
  athlete_id BIGINT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- データ取得状況テーブル
CREATE TABLE IF NOT EXISTS fetch_status (
  athlete_id BIGINT PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  progress JSONB,
  error TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stats_updated_at ON stats(updated_at DESC);

-- Row Level Security (RLS) を有効化
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_status ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーが読み書きできるポリシー（開発用）
-- 本番環境では適切なポリシーに変更してください
CREATE POLICY "Enable all access for all users" ON tokens
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON stats
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON fetch_status
  FOR ALL USING (true);
