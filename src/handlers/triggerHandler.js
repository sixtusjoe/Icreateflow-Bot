import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getTicket, updateTicket, getTriggerCooldown, upsertTriggerCooldown, insertEvent } from '../db/database.js';
import { parseMentions, matchesTrigger } from '../utils/mentions.js';
import { renderString, buildVars } from '../utils/templates.js';
import { sendDm, notifyDmFailed } from './dmHandler.js';
import { logEvent } from './logHandler.js';
import { cancelTimer, rearmTimer } from './timerHandler.js';
import { log } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _triggers = [];
let _client   = null;
let _config   = null;

export function initTriggerHandler(client, config) {
  _client   = client;
  _config   = config;
  _triggers = config.mention_triggers ?? [];
  log.info(`[triggerHandler] Loaded ${_triggers.length} mention trigger(s)`);
}

export function reloadTriggers() {
  const fresh = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  _triggers = fresh.mention_triggers ?? [];
  _config   = fresh;
  log.info(`[triggerHandler] Reloaded ${_triggers.length} mention trigger(s)`);
  return _triggers;
}

export function getTriggers() {
  return _triggers;
}

export async function evaluate(message, ticket) {
  const mentions = parseMentions(message);

  for (const trigger of _triggers) {
    try {
      if (!trigger.active_in_status.includes(ticket.status)) continue;
      if (trigger.only_from_ticket_owner && message.author.id !== ticket.user_id) continue;

      if (trigger.only_from_role) {
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member?.roles.cache.has(trigger.only_from_role)) continue;
      }

      if (!matchesTrigger(mentions, trigger.match)) continue;

      const cooldownRow = getTriggerCooldown(message.channel.id, trigger.id);
      if (cooldownRow) {
        const elapsed = Date.now() - cooldownRow.last_fired;
        if (elapsed < trigger.cooldown_seconds * 1000) continue;
      }

      log.info(`[triggerHandler] Firing trigger "${trigger.id}" in ${message.channel.id}`);
      await executeActions(trigger, message, ticket);

      upsertTriggerCooldown(message.channel.id, trigger.id);
      insertEvent({
        channelId: message.channel.id,
        eventType: 'trigger_fired',
        actorId: message.author.id,
        metadata: { triggerId: trigger.id, triggerName: trigger.name },
      });
      await logEvent(
        'trigger_fired',
        { Trigger: trigger.name, Channel: `<#${message.channel.id}>`, Actor: `<@${message.author.id}>` },
        { channelId: message.channel.id, actorId: message.author.id }
      );
    } catch (err) {
      log.error(`[triggerHandler] Error evaluating trigger "${trigger.id}":`, err.message);
    }
  }
}

async function executeActions(trigger, message, ticket) {
  const channel = message.channel;
  const guild   = message.guild;
  const vars    = buildVars({
    user:         `<@${message.author.id}>`,
    username:     message.author.username,
    channel:      `<#${channel.id}>`,
    guild:        guild.name,
    trigger_name: trigger.name,
  });

  for (const action of trigger.actions) {
    try {
      await executeAction(action, { channel, guild, ticket, vars, client: _client, config: _config });
    } catch (err) {
      log.error(`[triggerHandler] Action "${action.type}" failed in trigger "${trigger.id}":`, err.message);
    }
  }
}

async function executeAction(action, ctx) {
  const { channel, guild, ticket, vars, client, config } = ctx;

  switch (action.type) {
    case 'reply':
      await channel.send(renderString(action.message, vars));
      break;

    case 'ping_role': {
      const msg = renderString(action.message, vars);
      await channel.send({ content: `<@&${action.role_id}> ${msg}` });
      break;
    }

    case 'ping_user': {
      const msg = renderString(action.message, vars);
      await channel.send({ content: `<@${action.user_id}> ${msg}` });
      break;
    }

    case 'dm_user': {
      const result = await sendDm(client, ticket.user_id, action.template, vars, channel.id);
      if (!result.success) await notifyDmFailed(channel, ticket.user_id);
      break;
    }

    case 'hide_user': {
      await channel.permissionOverwrites.edit(ticket.user_id, {
        ViewChannel: false,
      }).catch((err) => {
        log.warn(`[triggerHandler] hide_user failed: ${err.message}`);
      });
      break;
    }

    case 'move_ticket': {
      const { moveTicket } = await import('./ticketHandler.js');
      await moveTicket(client, config, channel.id, action.to, { skipDm: true });
      break;
    }

    case 'stop_inactivity_timer':
      cancelTimer(channel.id);
      break;

    case 'reset_inactivity_timer':
      rearmTimer(channel.id, action.minutes ?? null);
      break;

    case 'add_role': {
      const member = await guild.members.fetch(ticket.user_id);
      await member.roles.add(action.role_id);
      break;
    }

    case 'remove_role': {
      const member = await guild.members.fetch(ticket.user_id);
      await member.roles.remove(action.role_id);
      break;
    }

    case 'set_status':
      updateTicket(channel.id, { status: action.status });
      break;

    case 'log':
      await logEvent('trigger_fired', { Message: renderString(action.message, vars) }, { channelId: channel.id });
      break;

    case 'close_ticket': {
      const { closeTicket } = await import('./ticketHandler.js');
      await closeTicket(client, config, channel.id, action.reason ?? 'Closed by trigger');
      break;
    }

    default:
      log.warn(`[triggerHandler] Unknown action type: "${action.type}"`);
  }
}
