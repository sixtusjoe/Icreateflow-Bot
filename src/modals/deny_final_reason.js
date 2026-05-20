import { MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { moveTicket } from '../handlers/ticketHandler.js';
import { sendDm, notifyDmFailed } from '../handlers/dmHandler.js';
import { buildVars } from '../utils/templates.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function denyFinalReason(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config    = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const channelId = interaction.customId.split('|')[1];
  const ticket    = getTicket(channelId);
  const reason    = interaction.fields.getTextInputValue('reason');

  const vars = buildVars({ user: `<@${ticket.user_id}>`, guild: interaction.guild.name, reason });
  const result = await sendDm(interaction.client, ticket.user_id, 'denied_final', vars, channelId);

  if (!result.success) {
    const ticketChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (ticketChannel) await notifyDmFailed(ticketChannel, ticket.user_id);
  }

  await moveTicket(interaction.client, config, channelId, 'denied', {
    actorId: interaction.user.id,
    reason,
    skipDm: true,
  });

  await interaction.editReply({ content: '❌ Application denied. DM sent to applicant.' });
}
