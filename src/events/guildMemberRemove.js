import { closeTicket } from '../handlers/ticketHandler.js';
import { getAllOpenTicketsForUser } from '../db/database.js';
import { log } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    const guildId = member.guild.id;

    // Load the correct config for whichever guild the user left
    let config;
    try {
      const campaignConfig = JSON.parse(readFileSync(join(__dirname, '../../config.campaign.json'), 'utf8'));
      if (guildId === campaignConfig.guild_id) {
        // Campaign server — use campaign config
        config = campaignConfig;
      } else {
        config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
      }
    } catch {
      config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
    }

    // Only close tickets that belong to this guild
    const tickets = getAllOpenTicketsForUser(member.id).filter(t => t.guild_id === guildId);

    if (tickets.length === 0) return;

    log.info(`[guildMemberRemove] ${member.user.tag} left ${member.guild.name} — closing ${tickets.length} ticket(s)`);

    for (const ticket of tickets) {
      try {
        await closeTicket(member.client, config, ticket.channel_id, 'User left server', { skipDm: true });
      } catch (err) {
        log.error(`[guildMemberRemove] Failed to close ticket ${ticket.channel_id}:`, err.message);
      }
    }
  },
};
