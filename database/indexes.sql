--
-- The Socratic Paradox
-- Performance indexes for high-cardinality aggregation and list views
--

BEGIN;

-- User-scoped entry queries (timeline, dashboard, pagination)
CREATE INDEX IF NOT EXISTS idx_entries_user_id_created_at
    ON entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_user_id_status
    ON entries(user_id, status);

CREATE INDEX IF NOT EXISTS idx_entries_completed_at
    ON entries(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Analytics: count sessions per user/status
CREATE INDEX IF NOT EXISTS idx_entries_user_status_created
    ON entries(user_id, status, created_at DESC);

-- Distortion link aggregation
CREATE INDEX IF NOT EXISTS idx_entry_distortions_distortion_id
    ON entry_distortions(distortion_id);

CREATE INDEX IF NOT EXISTS idx_entry_distortions_entry_id
    ON entry_distortions(entry_id);

-- GIN indexes for JSONB interrogation snapshots
CREATE INDEX IF NOT EXISTS idx_entries_interrogation_gin
    ON entries USING GIN (interrogation jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_entries_distortion_analysis_gin
    ON entries USING GIN (distortion_analysis jsonb_path_ops);

-- Prompt lookup by category
CREATE INDEX IF NOT EXISTS idx_socratic_prompts_category
    ON socratic_prompts(category, sort_order);

-- Daily journal lookup by user and date
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id_entry_date
    ON journal_entries(user_id, entry_date DESC);

COMMIT;
