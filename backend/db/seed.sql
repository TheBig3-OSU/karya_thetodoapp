-- ============================================================
-- Karya — development seed data
-- ============================================================
-- Seeds the global `levels` curve plus a sample gana ("Vajra")
-- with heroes, categories, quests, attachments, an XP ledger,
-- and thread comments — enough to exercise every table.
--
-- Idempotent for dev: wipes all tables and restarts identities,
-- so it can be re-run freely. DO NOT run against real data.
-- References use natural keys (username / team name / task title)
-- so it never depends on generated id values.
-- ============================================================

BEGIN;

TRUNCATE
    task_reactions, threads, xp_events, user_team_xp, task_attachments, tasks,
    levels, task_categories, team_members, teams, user_profile
    RESTART IDENTITY CASCADE;

-- ---------- Level thresholds (global) ----------
-- xp_upper_bound = cumulative XP at which you advance to the next level.
INSERT INTO levels (level, xp_upper_bound) VALUES
    (1,   100),
    (2,   300),
    (3,   600),
    (4,  1000),
    (5,  1500),
    (6,  2000),
    (7,  2500),
    (8,  2900),
    (9,  4000),
    (10, 5000);

-- ---------- Users (heroes) ----------
-- salted_password holds a (fake) bcrypt-style hash; never a plaintext password.
INSERT INTO user_profile (username, salted_password) VALUES
    ('harsha', '$2b$12$Dev0nlyFakeHashHarsha000000000000000000000000000000'),
    ('arjun',  '$2b$12$Dev0nlyFakeHashArjun0000000000000000000000000000000'),
    ('meera',  '$2b$12$Dev0nlyFakeHashMeera0000000000000000000000000000000'),
    ('kavya',  '$2b$12$Dev0nlyFakeHashKavya0000000000000000000000000000000');

-- ---------- Team (gana) ----------
INSERT INTO teams (name, invite_code, owner_id) VALUES
    ('Vajra', 'VAJRA-7K2', (SELECT id FROM user_profile WHERE username = 'harsha'));

-- ---------- Membership ----------
INSERT INTO team_members (team_id, user_id, role) VALUES
    ((SELECT id FROM teams WHERE name = 'Vajra'),
     (SELECT id FROM user_profile WHERE username = 'harsha'), 'admin'),
    ((SELECT id FROM teams WHERE name = 'Vajra'),
     (SELECT id FROM user_profile WHERE username = 'arjun'),  'member'),
    ((SELECT id FROM teams WHERE name = 'Vajra'),
     (SELECT id FROM user_profile WHERE username = 'meera'),  'member'),
    ((SELECT id FROM teams WHERE name = 'Vajra'),
     (SELECT id FROM user_profile WHERE username = 'kavya'),  'member');

-- ---------- Categories (per-team) ----------
INSERT INTO task_categories (team_id, name)
SELECT t.id, c.name
FROM teams t
CROSS JOIN (VALUES ('Fitness'), ('Study'), ('Work'), ('Mindfulness')) AS c(name)
WHERE t.name = 'Vajra';

-- ---------- Convenience: id lookups via natural keys ----------
-- (Inlined as subqueries below to keep this a plain script.)

-- ---------- Tasks (quests) ----------
INSERT INTO tasks
    (title, description, team_id, user_id, category_id, xp,
     is_completed, intermediary_progress, requires_vouch, vouched_by, vouched_at)
VALUES
    -- active, measurable (progress %)
    ('Run 5k before sunset', 'Zone-2 pace, no walking breaks',
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='arjun'),
     (SELECT id FROM task_categories WHERE name='Fitness' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     30, false, 70, false, NULL, NULL),

    ('Meditate 15 min', 'Breath focus, morning',
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='meera'),
     (SELECT id FROM task_categories WHERE name='Mindfulness' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     20, false, 40, false, NULL, NULL),

    ('Read 20 pages', 'Currently on chapter 3',
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='kavya'),
     (SELECT id FROM task_categories WHERE name='Study' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     25, false, 70, false, NULL, NULL),

    -- active, simple (no progress meter)
    ('Clear work inbox', NULL,
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='harsha'),
     (SELECT id FROM task_categories WHERE name='Work' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     15, false, NULL, false, NULL, NULL),

    ('Revise Sanskrit verbs', 'Ganas of verbs 1–4',
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='harsha'),
     (SELECT id FROM task_categories WHERE name='Study' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     20, false, NULL, false, NULL, NULL),

    -- completed, no vouch required
    ('Stretch 10 min', NULL,
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='arjun'),
     (SELECT id FROM task_categories WHERE name='Fitness' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     10, true, 100, false, NULL, NULL),

    -- completed AND vouched (voucher != doer -> satisfies no_self_vouch)
    ('Morning standup', 'Daily sync note posted',
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='meera'),
     (SELECT id FROM task_categories WHERE name='Work' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     10, true, 100, true,
     (SELECT id FROM user_profile WHERE username='harsha'), now() - interval '3 hours'),

    ('Ship onboarding flow', 'Screens 1–9 wired in Figma',
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT id FROM user_profile WHERE username='harsha'),
     (SELECT id FROM task_categories WHERE name='Work' AND team_id=(SELECT id FROM teams WHERE name='Vajra')),
     40, true, 100, true,
     (SELECT id FROM user_profile WHERE username='arjun'), now() - interval '1 day');

-- ---------- Attachments ----------
INSERT INTO task_attachments (task_id, file_url, filename, uploaded_by) VALUES
    ((SELECT task_id FROM tasks WHERE title='Ship onboarding flow'),
     'https://storage.example/karya/onboarding-final.pdf', 'onboarding-final.pdf',
     (SELECT id FROM user_profile WHERE username='harsha')),
    ((SELECT task_id FROM tasks WHERE title='Read 20 pages'),
     'https://storage.example/karya/page-14.jpg', 'page-14.jpg',
     (SELECT id FROM user_profile WHERE username='kavya'));

-- ---------- Per-team XP standing ----------
INSERT INTO user_team_xp (user_id, team_id, current_xp, level) VALUES
    ((SELECT id FROM user_profile WHERE username='harsha'),
     (SELECT id FROM teams WHERE name='Vajra'), 2980, 9),
    ((SELECT id FROM user_profile WHERE username='arjun'),
     (SELECT id FROM teams WHERE name='Vajra'), 2140, 7),
    ((SELECT id FROM user_profile WHERE username='meera'),
     (SELECT id FROM teams WHERE name='Vajra'), 1760, 6),
    ((SELECT id FROM user_profile WHERE username='kavya'),
     (SELECT id FROM teams WHERE name='Vajra'),  980, 4);

-- ---------- XP ledger (append-only) ----------
-- Awards from the completed/vouched quests above, plus a little history.
INSERT INTO xp_events (user_id, team_id, task_id, xp_awarded, created_at) VALUES
    ((SELECT id FROM user_profile WHERE username='arjun'),
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT task_id FROM tasks WHERE title='Stretch 10 min'), 10, now() - interval '5 hours'),
    ((SELECT id FROM user_profile WHERE username='meera'),
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT task_id FROM tasks WHERE title='Morning standup'), 10, now() - interval '3 hours'),
    ((SELECT id FROM user_profile WHERE username='harsha'),
     (SELECT id FROM teams WHERE name='Vajra'),
     (SELECT task_id FROM tasks WHERE title='Ship onboarding flow'), 40, now() - interval '1 day'),
    -- a historical event whose task has since been deleted (task_id NULL)
    ((SELECT id FROM user_profile WHERE username='harsha'),
     (SELECT id FROM teams WHERE name='Vajra'), NULL, 25, now() - interval '4 days');

-- ---------- Threads (comments on quests) ----------
-- Composite PK is (task_id, posted_at, user_id); vary posted_at to stay unique.
INSERT INTO threads (task_id, user_id, posted_at, reply) VALUES
    ((SELECT task_id FROM tasks WHERE title='Run 5k before sunset'),
     (SELECT id FROM user_profile WHERE username='meera'),
     now() - interval '2 hours', 'let''s go!! 🔥'),
    ((SELECT task_id FROM tasks WHERE title='Run 5k before sunset'),
     (SELECT id FROM user_profile WHERE username='harsha'),
     now() - interval '90 minutes', 'you got this 💪'),
    ((SELECT task_id FROM tasks WHERE title='Read 20 pages'),
     (SELECT id FROM user_profile WHERE username='arjun'),
     now() - interval '30 minutes', 'almost there, 6 to go!');

-- ---------- Reactions (emoji on Loka cards) ----------
INSERT INTO task_reactions (task_id, user_id, emoji) VALUES
    ((SELECT task_id FROM tasks WHERE title='Run 5k before sunset'),
     (SELECT id FROM user_profile WHERE username='harsha'), '🔥'),
    ((SELECT task_id FROM tasks WHERE title='Run 5k before sunset'),
     (SELECT id FROM user_profile WHERE username='kavya'), '🔥'),
    ((SELECT task_id FROM tasks WHERE title='Read 20 pages'),
     (SELECT id FROM user_profile WHERE username='arjun'), '📚');

COMMIT;
