import { getTicket } from '../db/database.js';
import { cancelTimer } from '../handlers/timerHandler.js';
import { evaluate } from '../handlers/triggerHandler.js';
import { log } from '../utils/logger.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

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
  },
};
