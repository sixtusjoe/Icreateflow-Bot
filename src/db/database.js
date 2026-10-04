import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(join(__dirname, '../../data/bot.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migration: add task stage columns if they don't exist yet
const cols = db.prepare("PRAGMA table_info(tickets)").all().map(c => c.name);
if (!cols.includes('task_stage'))
  db.exec("ALTER TABLE tickets ADD COLUMN task_stage TEXT DEFAULT NULL");
if (!cols.includes('task_stage_expires_at'))
  db.exec("ALTER TABLE tickets ADD COLUMN task_stage_expires_at INTEGER DEFAULT NULL");

// Migration: campaign tables
db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_accounts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id         TEXT    NOT NULL,
    user_id          TEXT    NOT NULL,
    variation_number INTEGER NOT NULL,
    platform         TEXT    NOT NULL,
    username         TEXT    NOT NULL,
    email            TEXT    NOT NULL,
    password         TEXT    NOT NULL,
    submitted_at     INTEGER NOT NULL,
    UNIQUE(guild_id, user_id, variation_number, platform)
  );
  CREATE TABLE IF NOT EXISTS campaign_variation_state (
    user_id          TEXT    NOT NULL,
    guild_id         TEXT    NOT NULL,
    current_variation INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS campaign_payouts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id         TEXT    NOT NULL,
    user_id          TEXT    NOT NULL,
    full_name        TEXT    NOT NULL,
    wise_tag         TEXT    NOT NULL,
    usdt_address     TEXT    NOT NULL,
    variations_count INTEGER NOT NULL,
    expected_payout  TEXT    NOT NULL,
    submitted_at     INTEGER NOT NULL
  );
`);

export function getTicket(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

export function getOpenTicketForUser(userId, guildId) {
  return db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND guild_id = ? AND status IN ('open','in_task','approved') LIMIT 1"
  ).get(userId, guildId);
}

export function createTicket(data) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO tickets
      (channel_id, user_id, guild_id, status, current_category_id, created_at, last_activity_at, timer_expires_at)
    VALUES
      (@channelId, @userId, @guildId, @status, @currentCategoryId, @createdAt, @lastActivityAt, @timerExpiresAt)
  `).run({
    channelId: data.channelId,
    userId: data.userId,
    guildId: data.guildId,
    status: data.status,
    currentCategoryId: data.currentCategoryId,
    createdAt: now,
    lastActivityAt: now,
    timerExpiresAt: data.timerExpiresAt ?? null
  });
}

export function updateTicket(channelId, patch) {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const setClauses = keys.map(k => `${camelToSnake(k)} = @${k}`).join(', ');
  db.prepare(`UPDATE tickets SET ${setClauses} WHERE channel_id = @channelId`)
    .run({ ...patch, channelId });
}

export function getExpiredTimers() {
  const now = Date.now();
  return db.prepare(
    "SELECT * FROM tickets WHERE status = 'open' AND timer_expires_at IS NOT NULL AND timer_expires_at <= ?"
  ).all(now);
}

export function getWarningCandidates(warningMs) {
  const now = Date.now();
  return db.prepare(
    "SELECT * FROM tickets WHERE status = 'open' AND timer_expires_at IS NOT NULL AND timer_warning_sent = 0 AND (timer_expires_at - ?) <= ?"
  ).all(now, warningMs);
}

export function getScheduledDeletes() {
  const now = Date.now();
  return db.prepare(
    'SELECT * FROM tickets WHERE delete_at IS NOT NULL AND delete_at <= ?'
  ).all(now);
}

export function insertEvent(data) {
  db.prepare(`
    INSERT INTO ticket_events (channel_id, event_type, actor_id, metadata, created_at)
    VALUES (@channelId, @eventType, @actorId, @metadata, @createdAt)
  `).run({
    channelId: data.channelId,
    eventType: data.eventType,
    actorId: data.actorId ?? null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    createdAt: Date.now()
  });
}

export function getTriggerCooldown(channelId, triggerId) {
  return db.prepare(
    'SELECT last_fired FROM trigger_cooldowns WHERE channel_id = ? AND trigger_id = ?'
  ).get(channelId, triggerId);
}

export function upsertTriggerCooldown(channelId, triggerId) {
  db.prepare(`
    INSERT INTO trigger_cooldowns (channel_id, trigger_id, last_fired)
    VALUES (?, ?, ?)
    ON CONFLICT(channel_id, trigger_id) DO UPDATE SET last_fired = excluded.last_fired
  `).run(channelId, triggerId, Date.now());
}

export function getExpiredTaskStages() {
  const now = Date.now();
  return db.prepare(
    "SELECT * FROM tickets WHERE task_stage IN ('awaiting_tiktok','awaiting_drive') AND task_stage_expires_at IS NOT NULL AND task_stage_expires_at <= ? AND status NOT IN ('closed','denied')"
  ).all(now);
}

export function getTicketsByStatus(status, guildId) {
  if (guildId) {
    return db.prepare('SELECT * FROM tickets WHERE status = ? AND guild_id = ?').all(status, guildId);
  }
  return db.prepare('SELECT * FROM tickets WHERE status = ?').all(status);
}

export function getTicketsByTaskStage(taskStage, guildId) {
  if (guildId) {
    return db.prepare(
      "SELECT * FROM tickets WHERE task_stage = ? AND guild_id = ? AND status NOT IN ('closed', 'denied')"
    ).all(taskStage, guildId);
  }
  return db.prepare(
    "SELECT * FROM tickets WHERE task_stage = ? AND status NOT IN ('closed', 'denied')"
  ).all(taskStage);
}

export function getAllOpenTicketsForUser(userId) {
  return db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND status IN ('open','in_task','approved')"
  ).all(userId);
}

export function getTicketStats() {
  const statuses = db.prepare(
    "SELECT status, COUNT(*) as count FROM tickets GROUP BY status"
  ).all();
  const total  = db.prepare("SELECT COUNT(*) as count FROM tickets").get().count;
  const events = db.prepare("SELECT COUNT(*) as count FROM ticket_events WHERE event_type = 'dm_sent'").get().count;
  return { statuses, total, dmsSent: events };
}

// ─── Campaign helpers ───────────────────────────────────────────────────────

export function upsertAccountSubmission({ guildId, userId, variationNumber, platform, username, email, password }) {
  db.prepare(`
    INSERT INTO campaign_accounts (guild_id, user_id, variation_number, platform, username, email, password, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id, variation_number, platform)
    DO UPDATE SET username = excluded.username, email = excluded.email,
                  password = excluded.password, submitted_at = excluded.submitted_at
  `).run(guildId, userId, variationNumber, platform, username, email, password, Date.now());
}

export function getCurrentVariation(userId, guildId) {
  const row = db.prepare(
    'SELECT current_variation FROM campaign_variation_state WHERE user_id = ? AND guild_id = ?'
  ).get(userId, guildId);
  return row?.current_variation ?? 1;
}

export function incrementVariation(userId, guildId) {
  const current = getCurrentVariation(userId, guildId);
  db.prepare(`
    INSERT INTO campaign_variation_state (user_id, guild_id, current_variation)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, guild_id) DO UPDATE SET current_variation = excluded.current_variation
  `).run(userId, guildId, current + 1);
  return current + 1;
}

export function getUserAccounts(userId, guildId) {
  return db.prepare(
    'SELECT * FROM campaign_accounts WHERE user_id = ? AND guild_id = ? ORDER BY variation_number, platform'
  ).all(userId, guildId);
}

export function getAllAccountSubmissions(guildId) {
  return db.prepare(
    'SELECT * FROM campaign_accounts WHERE guild_id = ? ORDER BY user_id, variation_number, platform'
  ).all(guildId);
}

export function insertPayoutSubmission({ guildId, userId, fullName, wiseTag, usdtAddress, variationsCount, expectedPayout }) {
  db.prepare(`
    INSERT INTO campaign_payouts (guild_id, user_id, full_name, wise_tag, usdt_address, variations_count, expected_payout, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, fullName, wiseTag, usdtAddress, variationsCount, expectedPayout, Date.now());
}

export function getAllPayoutSubmissions(guildId) {
  return db.prepare(
    'SELECT * FROM campaign_payouts WHERE guild_id = ? ORDER BY submitted_at DESC'
  ).all(guildId);
}

export { db };

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
