import { MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { closeTicket } from '../handlers/ticketHandler.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function closeConfirm(interaction) {
  const answer = interaction.fields.getTextInputValue('close_reason').trim().toLowerCase();

  if (answer !== 'yes') {
    return interaction.reply({ content: '❌ Close cancelled.', flags: MessageFlags.Ephemeral });
  }

  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await closeTicket(interaction.client, config, interaction.channel.id, 'Closed by ticket owner', { actorId: interaction.user.id });
  } catch (err) {
    // channel may have been deleted already — ignore
  }

  await interaction.editReply({ content: '🔒 Ticket closed.' }).catch(() => {});
}
