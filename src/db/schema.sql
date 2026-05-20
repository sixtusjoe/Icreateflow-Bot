CREATE TABLE IF NOT EXISTS tickets (
  channel_id          TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  guild_id            TEXT NOT NULL,
  status              TEXT NOT NULL CHECK(status IN ('open','in_task','approved','denied','closed')),
  current_category_id TEXT NOT NULL,
  created_at          INTEGER NOT NULL,
  last_activity_at    INTEGER NOT NULL,
  timer_expires_at    INTEGER,
  timer_warning_sent  INTEGER DEFAULT 0,
  closed_at           INTEGER,
  closed_reason       TEXT,
  retry_count         INTEGER DEFAULT 0,
  delete_at           INTEGER,
  task_stage          TEXT DEFAULT NULL,
  task_stage_expires_at INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id   TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  actor_id     TEXT,
  metadata     TEXT,
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES tickets(channel_id)
);

CREATE TABLE IF NOT EXISTS trigger_cooldowns (
  channel_id  TEXT NOT NULL,
  trigger_id  TEXT NOT NULL,
  last_fired  INTEGER NOT NULL,
  PRIMARY KEY (channel_id, trigger_id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_user   ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_timer  ON tickets(timer_expires_at) WHERE timer_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_delete ON tickets(delete_at) WHERE delete_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_channel ON ticket_events(channel_id);
