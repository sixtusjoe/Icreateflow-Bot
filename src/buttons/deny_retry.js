import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getTicket } from '../db/database.js';
import { isStaff } from '../utils/permissions.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function denyRetry(interaction) {
  const config    = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const channelId = interaction.customId.split('|')[1];
  const ticket    = getTicket(channelId);

  if (!ticket) return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true });
  if (!isStaff(interaction.member, config)) return interaction.reply({ content: '❌ Only staff can send tickets back for revision.', ephemeral: true });
  if (ticket.status !== 'in_task') return interaction.reply({ content: '❌ This ticket is not currently in the review stage.', ephemeral: true });

  if ((ticket.retry_count ?? 0) >= config.max_retries) {
    return interaction.reply({ content: `❌ Max retries (${config.max_retries}) reached — use **Deny — Final** instead.`, ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`deny_retry_reason|${channelId}`)
    .setTitle('Return for Revision');

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('What needs to be revised?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(200)
      .setPlaceholder('Tell the applicant what to fix and resubmit.')
  ));

  await interaction.showModal(modal);
}
