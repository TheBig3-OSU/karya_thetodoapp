-- ============================================================
-- Karya — clear all data
-- ============================================================
-- Empties every table and restarts identity sequences, leaving
-- the schema (tables, constraints, indexes) intact.
--
-- ⚠️  DESTRUCTIVE: deletes ALL rows in ALL tables. Dev use only.
--     Run with:  psql "$DATABASE_URL" -f db/clear.sql
--     (or via the same runner used for schema.sql / seed.sql)
--
-- CASCADE is required because of the foreign keys between tables;
-- truncating everything together in one statement avoids ordering
-- issues and satisfies all FK dependencies atomically.
-- ============================================================

BEGIN;

TRUNCATE
    threads,
    xp_events,
    user_team_xp,
    task_attachments,
    tasks,
    levels,
    task_categories,
    team_members,
    teams,
    user_profile
    RESTART IDENTITY CASCADE;

COMMIT;
