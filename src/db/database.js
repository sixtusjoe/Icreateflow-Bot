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

export function getTicket(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

export function getOpenTicketForUser(userId) {
  return db.prepare(
    "SELECT * FROM tickets WHERE user_id = ? AND status IN ('open','in_task','approved') LIMIT 1"
  ).get(userId);
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
    "SELECT * FROM tickets WHERE task_stage IN ('awaiting_tiktok','awaiting_drive') AND task_stage_expires_at IS NOT NULL AND task_stage_expires_at <= ?"
  ).all(now);
}

export function getTicketsByStatus(status) {
  return db.prepare('SELECT * FROM tickets WHERE status = ?').all(status);
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

export { db };

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
