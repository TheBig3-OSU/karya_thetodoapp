-- Migration 001 — add teams.invite_code (API spec §4: needed for POST /teams/join).
-- Backfills existing teams (Vajra gets the code shown in the Figma), then
-- locks the column down to NOT NULL UNIQUE. Safe to re-run.

BEGIN;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code TEXT;

UPDATE teams SET invite_code = 'VAJRA-7K2'
WHERE name = 'Vajra' AND invite_code IS NULL;

-- Any other pre-existing team: NAME prefix + 3 pseudo-random chars.
UPDATE teams
SET invite_code = upper(left(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'), 5))
                  || '-' || upper(left(md5(random()::text || id::text), 3))
WHERE invite_code IS NULL;

ALTER TABLE teams ALTER COLUMN invite_code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teams_invite_code_key'
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT teams_invite_code_key UNIQUE (invite_code);
    END IF;
END $$;

COMMIT;
