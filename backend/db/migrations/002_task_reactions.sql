-- Migration 002 — task_reactions (API spec §4 listed reactions as a gap:
-- Loka cards show them but no table existed). One row per user+emoji per
-- task; PK makes duplicate reactions impossible. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS task_reactions (
    task_id    BIGINT NOT NULL REFERENCES tasks(task_id)   ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    emoji      TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
    reacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_task_reactions_task ON task_reactions(task_id);

COMMIT;
