-- スキーマ更新: statsテーブルにclient_idを追加して複合キーに変更
-- Supabaseダッシュボードの SQL Editor で実行してください

-- 既存のstatsテーブルを削除（データが消えます！バックアップを取ってから実行）
DROP TABLE IF EXISTS stats CASCADE;

-- 新しいstatsテーブルを作成
CREATE TABLE stats (
  client_id VARCHAR(255) NOT NULL,
  athlete_id BIGINT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (client_id, athlete_id)
);

-- インデックス
CREATE INDEX idx_stats_updated_at ON stats(updated_at DESC);
CREATE INDEX idx_stats_athlete_id ON stats(athlete_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーが読み書きできるポリシー（開発用）
CREATE POLICY "Enable all access for all users" ON stats
  FOR ALL USING (true);
