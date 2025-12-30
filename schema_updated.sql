-- 既存テーブルを削除して新しいスキーマで再作成
-- 注意: 既存のデータは削除されます

DROP TABLE IF EXISTS fetch_status CASCADE;
DROP TABLE IF EXISTS stats CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;

-- トークンテーブル（client_id + athlete_idを複合主キーに）
CREATE TABLE tokens (
  client_id VARCHAR(255) NOT NULL,
  athlete_id BIGINT NOT NULL,
  athlete_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  athlete_profile JSONB,
  PRIMARY KEY (client_id, athlete_id)
);

-- 統計テーブル（client_id + athlete_idを複合主キーに）
CREATE TABLE stats (
  client_id VARCHAR(255) NOT NULL,
  athlete_id BIGINT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (client_id, athlete_id)
);

-- データ取得状況テーブル（client_id + athlete_idを複合主キーに）
CREATE TABLE fetch_status (
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
CREATE INDEX idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX idx_tokens_athlete_id ON tokens(athlete_id);
CREATE INDEX idx_stats_updated_at ON stats(updated_at DESC);
CREATE INDEX idx_stats_athlete_id ON stats(athlete_id);

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
