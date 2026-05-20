import { MessageFlags } from 'discord.js';
import { getTicket, updateTicket } from '../db/database.js';
import { moveTicket } from '../handlers/ticketHandler.js';
import { sendDm, notifyDmFailed } from '../handlers/dmHandler.js';
import { rearmTimer } from '../handlers/timerHandler.js';
import { buildRetryEmbed } from '../utils/embeds.js';
import { buildVars } from '../utils/templates.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function denyRetryReason(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config    = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const channelId = interaction.customId.split('|')[1];
  const ticket    = getTicket(channelId);
  const reason    = interaction.fields.getTextInputValue('reason');

  const vars = buildVars({ user: `<@${ticket.user_id}>`, guild: interaction.guild.name, reason });
  const result = await sendDm(interaction.client, ticket.user_id, 'denied_retry', vars, channelId);

  if (!result.success) {
    const ticketChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (ticketChannel) await notifyDmFailed(ticketChannel, ticket.user_id);
  }

  updateTicket(channelId, { retryCount: (ticket.retry_count ?? 0) + 1 });

  await moveTicket(interaction.client, config, channelId, 'open', {
    actorId: interaction.user.id,
    skipDm: true,
  });

  rearmTimer(channelId, config.timers.initial_inactivity_minutes);

  const updatedTicket = getTicket(channelId);
  const ticketChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (ticketChannel) {
    const retryEmbed = buildRetryEmbed(updatedTicket, reason, config, interaction.guild);
    await ticketChannel.send({ embeds: [retryEmbed] });
  }

  await interaction.editReply({ content: '🔄 Application returned for revision. Timer re-armed.' });
}
