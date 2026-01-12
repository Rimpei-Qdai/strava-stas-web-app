-- tokens テーブルから athlete_id と athlete_name カラムを削除
-- アスリート情報は athlete_profile JSONB カラムから取得するように変更

-- まず既存の主キー制約を削除
ALTER TABLE tokens
DROP CONSTRAINT IF EXISTS tokens_pkey;

-- athlete_id と athlete_name カラムを削除
ALTER TABLE tokens
DROP COLUMN IF EXISTS athlete_id;

ALTER TABLE tokens
DROP COLUMN IF EXISTS athlete_name;

-- client_id を新しい主キーとして設定
ALTER TABLE tokens
ADD PRIMARY KEY (client_id);

-- tokens テーブルに client_secret カラムを追加
-- これにより、管理者がローカル環境でトークンを自動リフレッシュできるようになります

ALTER TABLE tokens
ADD COLUMN IF NOT EXISTS client_secret TEXT;

-- 既存のデータに対しては NULL を許可
-- 新規登録時には client_secret が保存されます
