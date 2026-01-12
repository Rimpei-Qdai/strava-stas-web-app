-- stats テーブルから athlete_id カラムを削除
-- client_id のみを主キーとして使用するように変更

-- まず既存の主キー制約を削除
ALTER TABLE stats
DROP CONSTRAINT IF EXISTS stats_pkey;

-- athlete_id カラムを削除
ALTER TABLE stats
DROP COLUMN IF EXISTS athlete_id;

-- client_id を新しい主キーとして設定
ALTER TABLE stats
ADD PRIMARY KEY (client_id);

-- client_id の外部キー制約を追加（オプション）
ALTER TABLE stats
ADD CONSTRAINT stats_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES tokens(client_id) 
ON DELETE CASCADE;
