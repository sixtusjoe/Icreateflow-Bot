import {
  getExpiredTimers,
  getWarningCandidates,
  getScheduledDeletes,
  updateTicket,
  insertEvent,
} from '../db/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sendDm, notifyDmFailed } from './dmHandler.js';
import { logEvent } from './logHandler.js';
import { log } from '../utils/logger.js';
import { buildVars } from '../utils/templates.js';

let _client = null;
let _config = null;

export function initTimerHandler(client, config) {
  _client = client;
  _config = config;
}

export function reloadTimerConfig() {
  try {
    _config = JSON.parse(readFileSync(join(process.cwd(), 'config.json'), 'utf8'));
  } catch (err) {
    log.warn(`[timerHandler] Failed to reload config: ${err.message}`);
  }
}

export function cancelTimer(channelId, actorId = null) {
  updateTicket(channelId, { timerExpiresAt: null });
  insertEvent({ channelId, eventType: 'timer_cancelled', actorId });
  logEvent('timer_cancelled', { Channel: `<#${channelId}>` }, { channelId, actorId });
}

export function rearmTimer(channelId, minutes = null) {
  const mins = minutes ?? _config?.timers?.initial_inactivity_minutes ?? 180;
  const timerExpiresAt = Date.now() + mins * 60 * 1000;
  updateTicket(channelId, { timerExpiresAt, timerWarningSent: 0 });
}

export function startLoop() {
  // Handle any timers that expired while the bot was offline
  processExpiredTimers();

  setInterval(() => {
    processExpiredTimers();
    processTimerWarnings();
  }, 30_000);

  log.info('[timerHandler] Inactivity timer loop started (30s interval)');
}

export function startCleanupLoop() {
  // Also run immediately on startup to catch channels left over from previous sessions
  processScheduledDeletes();

  setInterval(() => {
    processScheduledDeletes();
  }, 15_000);

  log.info('[timerHandler] Cleanup loop started (15s interval)');
}

async function processExpiredTimers() {
  const expired = getExpiredTimers();
  for (const ticket of expired) {
    try {
      const { closeTicket } = await import('./ticketHandler.js');
      await closeTicket(_client, _config, ticket.channel_id, 'inactivity');
    } catch (err) {
      log.error(`[timerHandler] Failed to close expired ticket ${ticket.channel_id}:`, err.message);
    }
  }
}

async function processTimerWarnings() {
  if (!_config) return;
  const warningMs = _config.timers.warning_minutes * 60 * 1000;
  const candidates = getWarningCandidates(warningMs);

  for (const ticket of candidates) {
    const minutesLeft = Math.ceil((ticket.timer_expires_at - Date.now()) / 60_000);
    const vars = buildVars({ minutes: minutesLeft, user: `<@${ticket.user_id}>` });

    const result = await sendDm(_client, ticket.user_id, 'timer_warning', vars, ticket.channel_id);
    updateTicket(ticket.channel_id, { timerWarningSent: 1 });

    if (!result.success) {
      try {
        const channel = await _client.channels.fetch(ticket.channel_id);
        await notifyDmFailed(channel, ticket.user_id);
      } catch {}
    }
  }
}

async function processScheduledDeletes() {
  const toDelete = getScheduledDeletes();
  for (const ticket of toDelete) {
    try {
      const channel = await _client.channels.fetch(ticket.channel_id).catch(() => null);
      if (channel) await channel.delete('Ticket scheduled deletion');

      updateTicket(ticket.channel_id, { deleteAt: null });
      insertEvent({ channelId: ticket.channel_id, eventType: 'deleted' });
      logEvent('deleted', { Channel: ticket.channel_id, Owner: `<@${ticket.user_id}>` }, { channelId: ticket.channel_id });
    } catch (err) {
      log.error(`[timerHandler] Failed to delete ticket ${ticket.channel_id}:`, err.message);
    }
  }
}
