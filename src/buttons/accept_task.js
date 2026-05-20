import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getTicket } from '../db/database.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function acceptTask(interaction) {
  const config    = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const channelId = interaction.customId.split('|')[1];
  const ticket    = getTicket(channelId);

  if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
  if (!isStaff(interaction.member, config)) return interaction.reply({ content: '❌ Only staff can accept applications.', ephemeral: true });
  if (ticket.status !== 'in_task') return interaction.reply({ content: '❌ This ticket is not currently in the review stage.', ephemeral: true });

  const modal = new ModalBuilder()
    .setCustomId(`accept_task_campaign|${channelId}`)
    .setTitle('Accept — Assign Campaign');

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('campaign_link')
      .setLabel('Campaign link or details (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500)
      .setPlaceholder('Paste the campaign link or any details to send to the creator.')
  ));

  await interaction.showModal(modal);
}
