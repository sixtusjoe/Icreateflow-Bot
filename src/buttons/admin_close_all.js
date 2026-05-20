import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { db } from '../db/database.js';
import { closeTicket } from '../handlers/ticketHandler.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adminCloseAll(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config  = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const tickets = db.prepare(
    "SELECT * FROM tickets WHERE status IN ('open','in_task','approved')"
  ).all();

  let closed = 0;
  for (const ticket of tickets) {
    try {
      await closeTicket(interaction.client, config, ticket.channel_id, 'Closed by admin', { actorId: interaction.user.id, skipDm: false });
      closed++;
    } catch (err) {
      log.warn(`[admin] Failed to close ticket ${ticket.channel_id}: ${err.message}`);
    }
  }

  await interaction.editReply({ content: `✅ Closed **${closed}** ticket(s).` });
}
