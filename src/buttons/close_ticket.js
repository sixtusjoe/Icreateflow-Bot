import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { closeTicket } from '../handlers/ticketHandler.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function closeTicketButton(interaction) {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const ticket = getTicket(interaction.channel.id);

  if (!ticket) {
    return interaction.reply({ content: '❌ This is not an active ticket.', flags: MessageFlags.Ephemeral });
  }

  if (isStaff(interaction.member, config)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await closeTicket(interaction.client, config, interaction.channel.id, 'Closed by staff', { actorId: interaction.user.id });
    } catch (err) {
      // channel may have been deleted already — ignore
    }
    await interaction.editReply({ content: '🔒 Ticket closed.' }).catch(() => {});
    return;
  }

  if (interaction.user.id === ticket.user_id) {
    const modal = new ModalBuilder()
      .setCustomId('close_confirm')
      .setTitle('Close Your Ticket');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Are you sure? Type "yes" to confirm.')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    return interaction.showModal(modal);
  }

  return interaction.reply({ content: "❌ You don't have permission to close this ticket.", flags: MessageFlags.Ephemeral });
}
