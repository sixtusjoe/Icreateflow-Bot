import { render, buildVars } from '../utils/templates.js';
import { buildDmEmbed } from '../utils/embeds.js';
import { insertEvent } from '../db/database.js';
import { log } from '../utils/logger.js';

const DM_TITLES = {
  ticket_opened:   '🎫  Ticket Opened',
  moved_to_task:   '📋  Application Under Review',
  accepted:        '✅  Application Accepted',
  denied_final:    '📭  Application Denied',
  denied_retry:    '🔄  Revision Required',
  closed_inactive: '📭  Ticket Closed — Inactivity',
  closed_manual:   '📭  Ticket Closed',
  timer_warning:   '⏳  Timer Warning',
};

const DM_STATUS = {
  ticket_opened:   'open',
  moved_to_task:   'in_task',
  accepted:        'approved',
  denied_final:    'denied',
  denied_retry:    'open',
  closed_inactive: 'closed',
  closed_manual:   'closed',
  timer_warning:   'open',
};

export async function sendDm(client, userId, templateKey, vars = {}, channelId = null) {
  const allVars = { ...buildVars(), ...vars };
  let text;
  try {
    text = render(templateKey, allVars);
  } catch (err) {
    log.error(`[dmHandler] Bad template key "${templateKey}":`, err.message);
    return { success: false };
  }

  try {
    const user = await client.users.fetch(userId);
    const embed = buildDmEmbed(
      DM_TITLES[templateKey] ?? '📋  Notification',
      text,
      DM_STATUS[templateKey] ?? 'info'
    );
    await user.send({ embeds: [embed] });

    if (channelId) insertEvent({ channelId, eventType: 'dm_sent', metadata: { templateKey } });
    return { success: true };
  } catch (err) {
    log.warn(`[dmHandler] Failed to DM ${userId}:`, err.message);
    if (channelId) insertEvent({ channelId, eventType: 'dm_failed', metadata: { templateKey, error: err.message } });
    return { success: false };
  }
}

export async function notifyDmFailed(channel, userId) {
  try {
    await channel.send(`⚠️ Couldn't DM <@${userId}> — they may have DMs disabled.`);
  } catch (err) {
    log.warn('[dmHandler] Could not post DM failure notice:', err.message);
  }
}
