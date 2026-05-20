import { closeAllTicketsForUser } from '../handlers/ticketHandler.js';
import { log } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
    try {
      await closeAllTicketsForUser(member.client, config, member.id);
    } catch (err) {
      log.error(`[guildMemberRemove] Failed to close tickets for ${member.id}:`, err.message);
    }
  },
};
