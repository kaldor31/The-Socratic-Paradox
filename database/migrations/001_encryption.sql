BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS encryption_salt TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_data_key TEXT;

ALTER TABLE entries
  ALTER COLUMN thesis TYPE TEXT,
  DROP CONSTRAINT IF EXISTS entries_thesis_check,
  ALTER COLUMN interrogation TYPE TEXT USING COALESCE(interrogation::text, ''),
  ALTER COLUMN distortion_analysis TYPE TEXT USING COALESCE(distortion_analysis::text, ''),
  ALTER COLUMN synthesis TYPE TEXT;

ALTER TABLE journal_entries
  ALTER COLUMN answers TYPE TEXT USING COALESCE(answers::text, ''),
  ALTER COLUMN drawing TYPE TEXT;

COMMIT;
