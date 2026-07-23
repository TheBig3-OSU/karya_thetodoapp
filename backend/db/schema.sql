-- ============================================================
-- Karya — The Todo App
-- PostgreSQL schema (from design revision 5)
-- ============================================================
-- Conventions:
--   • Surrogate PKs use BIGINT GENERATED ALWAYS AS IDENTITY.
--     Swap to UUID (gen_random_uuid()) if you'd rather not expose
--     sequential ids in URLs.
--   • Timestamps are TIMESTAMPTZ defaulting to now().
-- Tables are declared in dependency order.
-- ============================================================

-- ---------- User Profile ----------
CREATE TABLE user_profile (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    salted_password TEXT NOT NULL,            -- store the hash; salt embedded per bcrypt/argon2
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Teams ----------
CREATE TABLE teams (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,           -- join code shown in the Gana UI, e.g. VAJRA-7K2
    owner_id    BIGINT NOT NULL REFERENCES user_profile(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_owner ON teams(owner_id);

-- ---------- Team membership (junction) ----------
CREATE TABLE team_members (
    team_id   BIGINT NOT NULL REFERENCES teams(id)        ON DELETE CASCADE,
    user_id   BIGINT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    role      TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ---------- Task categories (per-team, member-defined) ----------
CREATE TABLE task_categories (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    UNIQUE (team_id, name)
);
CREATE INDEX idx_task_categories_team ON task_categories(team_id);

-- ---------- Level thresholds (global) ----------
CREATE TABLE levels (
    level          INTEGER PRIMARY KEY,
    xp_upper_bound INTEGER NOT NULL CHECK (xp_upper_bound >= 0)
);

-- ---------- Tasks ----------
CREATE TABLE tasks (
    task_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title                 TEXT NOT NULL,
    description           TEXT,
    team_id               BIGINT NOT NULL REFERENCES teams(id)           ON DELETE CASCADE,
    user_id               BIGINT NOT NULL REFERENCES user_profile(id)    ON DELETE RESTRICT,  -- the doer/assignee
    category_id           BIGINT          REFERENCES task_categories(id) ON DELETE RESTRICT,  -- nullable
    xp                    INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    is_completed          BOOLEAN NOT NULL DEFAULT false,
    intermediary_progress INTEGER CHECK (intermediary_progress BETWEEN 0 AND 100),  -- TODO: confirm meaning; assumed % complete
    requires_vouch        BOOLEAN NOT NULL DEFAULT false,
    vouched_by            BIGINT REFERENCES user_profile(id) ON DELETE SET NULL,  -- nullable
    vouched_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- no self-vouching
    CONSTRAINT no_self_vouch CHECK (vouched_by IS NULL OR vouched_by <> user_id),
    -- a vouch implies both a voucher and a time
    CONSTRAINT vouch_consistency CHECK (
        (vouched_by IS NULL AND vouched_at IS NULL)
        OR (vouched_by IS NOT NULL AND vouched_at IS NOT NULL)
    )
);
CREATE INDEX idx_tasks_team     ON tasks(team_id);
CREATE INDEX idx_tasks_user     ON tasks(user_id);
CREATE INDEX idx_tasks_category ON tasks(category_id);

-- ---------- Task attachments ----------
CREATE TABLE task_attachments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(task_id)      ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    filename    TEXT NOT NULL,
    uploaded_by BIGINT NOT NULL REFERENCES user_profile(id)    ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

-- ---------- Per-team XP standing (one row per user per team) ----------
CREATE TABLE user_team_xp (
    user_id    BIGINT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    team_id    BIGINT NOT NULL REFERENCES teams(id)        ON DELETE CASCADE,
    current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    level      INTEGER NOT NULL DEFAULT 1 REFERENCES levels(level),
    PRIMARY KEY (user_id, team_id)
);

-- ---------- XP ledger (append-only) ----------
CREATE TABLE xp_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    team_id     BIGINT NOT NULL REFERENCES teams(id)        ON DELETE CASCADE,
    task_id     BIGINT          REFERENCES tasks(task_id)   ON DELETE SET NULL,  -- keep the event even if task is deleted
    xp_awarded  INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_xp_events_user_team ON xp_events(user_id, team_id);
CREATE INDEX idx_xp_events_task      ON xp_events(task_id);

-- ---------- Threads (comments on tasks) ----------
CREATE TABLE threads (
    task_id   BIGINT      NOT NULL REFERENCES tasks(task_id)      ON DELETE CASCADE,
    user_id   BIGINT      NOT NULL REFERENCES user_profile(id)    ON DELETE CASCADE,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reply     TEXT NOT NULL,
    PRIMARY KEY (task_id, posted_at, user_id)
);
CREATE INDEX idx_threads_user ON threads(user_id);

-- ---------- Reactions (emoji on Loka task cards) ----------
CREATE TABLE task_reactions (
    task_id    BIGINT NOT NULL REFERENCES tasks(task_id)   ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
    emoji      TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
    reacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, user_id, emoji)
);
CREATE INDEX idx_task_reactions_task ON task_reactions(task_id);
