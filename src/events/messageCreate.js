import { getTicket } from '../db/database.js';
import { cancelTimer } from '../handlers/timerHandler.js';
import { evaluate } from '../handlers/triggerHandler.js';
import { log } from '../utils/logger.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

let _campaignGuildId = null;
try { _campaignGuildId = loadCampaignConfig().guild_id; } catch {}

export default {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // Campaign server has no task-stage / timer / trigger logic — skip entirely
    if (_campaignGuildId && message.guildId === _campaignGuildId) return;

    const ticket = getTicket(message.channel.id);
    if (!ticket) return;

    // Cancel timer when ticket owner sends their first message
    if (message.author.id === ticket.user_id && ticket.timer_expires_at !== null) {
      cancelTimer(message.channel.id, message.author.id);
      log.info(`[messageCreate] Timer cancelled for ticket ${message.channel.id} by owner`);
      await message.channel.send({
        content: `✅ Auto-close timer cancelled — your ticket is safe, <@${message.author.id}>!`,
      }).catch(() => {});
    }

    try {
      await evaluate(message, ticket);
    } catch (err) {
      log.error('[messageCreate] Trigger evaluation error:', err.message);
    }

    // Task stage progression — check for TikTok/Drive links from ticket owner
    if (ticket.task_stage) {
      if (message.author.id !== ticket.user_id) {
        log.info(`[messageCreate] Skipping task stage — sender ${message.author.id} is not ticket owner ${ticket.user_id}`);
      } else {
        try {
          const { advanceTaskStage } = await import('../handlers/taskHandler.js');
          // Re-fetch ticket so we have latest task_stage after any trigger updates
          const { getTicket: freshGet } = await import('../db/database.js');
          const fresh = freshGet(message.channel.id);
          if (fresh?.task_stage) {
            log.info(`[messageCreate] Checking task stage "${fresh.task_stage}" — content: ${message.content.slice(0, 100)}`);
            const { readFileSync } = await import('fs');
            const { join } = await import('path');
            const config = JSON.parse(readFileSync(join(process.cwd(), 'config.json'), 'utf8'));
            await advanceTaskStage(message.client, config, fresh, message);
          }
        } catch (err) {
          log.error(`[messageCreate] Task stage error: ${err.message}`, err.stack);
        }
      }
    }
  },
};
