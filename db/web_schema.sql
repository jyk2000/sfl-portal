-- ---------------------------------------------------------------------------
-- Web-only tables for the SFL shuttle-leg portal.
--
-- These live in the SAME database as the bot's `shuttle_legs`, but they are
-- owned by the portal and are deliberately NOT part of bot/schema_ddl.py:
--   * the bot must never depend on a web table, and
--   * the bot's test harness truncates its own tables and must not touch these.
--
-- Applied idempotently by `npm run migrate`.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS web_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL,
  display_name  VARCHAR(128) DEFAULT NULL,
  -- "scrypt$<saltHex>$<hashHex>" (see lib/password.ts). Never a plaintext.
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'dispatcher', 'viewer') NOT NULL DEFAULT 'dispatcher',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  -- Bumping this invalidates every issued session cookie for the user.
  token_version INT          NOT NULL DEFAULT 0,
  last_login_at DATETIME     DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_web_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per changed field per save: who changed which leg field, from what to
-- what, and when. The leg records are the evidence sent to the client, so an
-- edit must never be silent.
CREATE TABLE IF NOT EXISTS leg_edits (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  leg_id    INT          NOT NULL,
  user_id   INT          NOT NULL,
  -- Denormalised so the trail survives a user being renamed or removed.
  username  VARCHAR(64)  NOT NULL,
  field     VARCHAR(64)  NOT NULL,
  old_value TEXT         DEFAULT NULL,
  new_value TEXT         DEFAULT NULL,
  note      VARCHAR(255) DEFAULT NULL,
  edited_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leg_edit_leg  (leg_id),
  INDEX idx_leg_edit_time (edited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The dispatcher's daily plan, entered in the portal before the shift starts
-- (the "Planned" half of each date tab's Planned vs Done matrix). Counts are
-- keyed by driver + load type + day; `team` is denormalised for convenience.
CREATE TABLE IF NOT EXISTS daily_plan_rows (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  plan_date  DATE         NOT NULL,
  user_id    BIGINT       NOT NULL,
  team       VARCHAR(64)  DEFAULT NULL,
  load_type  VARCHAR(48)  NOT NULL,
  planned    INT          NOT NULL DEFAULT 0,
  updated_by INT          DEFAULT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_plan_row (plan_date, user_id, load_type),
  INDEX idx_plan_date (plan_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
