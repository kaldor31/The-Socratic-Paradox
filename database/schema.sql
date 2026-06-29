--
-- The Socratic Paradox
-- PostgreSQL schema for Neon (serverless)
--
-- Tables:
--   users               : journal owners (anonymous or authenticated)
--   entries             : Socratic journal entries
--   distortions         : catalog of cognitive distortions
--   entry_distortions   : many-to-many link with evidence strength
--   socratic_prompts    : reusable prompt templates
--

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE,
    handle        VARCHAR(32) UNIQUE,
    password_hash VARCHAR(255),
    encryption_salt TEXT,
    encrypted_data_key TEXT,
    is_anonymous  BOOLEAN NOT NULL DEFAULT true,
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    verification_code VARCHAR(10),
    verification_expires_at TIMESTAMPTZ,
    reset_token   VARCHAR(255),
    reset_expires_at TIMESTAMPTZ,
    pending_email VARCHAR(255) UNIQUE,
    email_change_code VARCHAR(10),
    email_change_expires_at TIMESTAMPTZ,
    language      VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- these fields are encrypted client-side before storage
    thesis          TEXT NOT NULL,
    -- interrogation snapshot: encrypted JSON array of {question_id, answer, asked_at}
    interrogation   TEXT NOT NULL DEFAULT '',
    -- distortion analysis snapshot: encrypted JSON array of {distortion_id, confidence, rationale}
    distortion_analysis TEXT NOT NULL DEFAULT '',
    synthesis       TEXT,
    -- completion state machine: thesis | interrogation | distortions | synthesis
    status          VARCHAR(20) NOT NULL DEFAULT 'thesis',
    is_favorite     BOOLEAN NOT NULL DEFAULT false,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distortions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(32) NOT NULL UNIQUE,
    label           VARCHAR(64) NOT NULL,
    description     TEXT NOT NULL,
    color_accent    VARCHAR(7) NOT NULL DEFAULT '#7c3aed',
    -- weighted count used in analytics dashboards
    occurrence_count INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entry_distortions (
    entry_id        UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    distortion_id   UUID NOT NULL REFERENCES distortions(id) ON DELETE CASCADE,
    confidence      SMALLINT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    evidence        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (entry_id, distortion_id)
);

CREATE TABLE IF NOT EXISTS socratic_prompts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(40) NOT NULL,
    slug            VARCHAR(64) NOT NULL UNIQUE,
    text            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date      DATE NOT NULL,
    -- encrypted client-side
    answers         TEXT NOT NULL DEFAULT '',
    drawing         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, entry_date)
);

COMMIT;
