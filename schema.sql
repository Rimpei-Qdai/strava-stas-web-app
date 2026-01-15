-- Supabaseのテーブル定義
-- Supabaseダッシュボードの SQL Editor で実行してください

-- トークンテーブル (client_idを主キーに変更)
CREATE TABLE IF NOT EXISTS tokens (
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

-- 統計テーブル (client_id + athlete_idの複合キー)
CREATE TABLE IF NOT EXISTS stats (
  client_id VARCHAR(255) NOT NULL,
  athlete_id BIGINT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (client_id, athlete_id)
);

-- データ取得状況テーブル (今は使用していませんが、将来のため残しています)
CREATE TABLE IF NOT EXISTS fetch_status (
  client_id VARCHAR(255) NOT NULL,
  athlete_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  progress JSONB,
  error TEXT,
  PRIMARY KEY (client_id, athlete_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_athlete_id ON tokens(athlete_id);
CREATE INDEX IF NOT EXISTS idx_stats_updated_at ON stats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stats_athlete_id ON stats(athlete_id);

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
