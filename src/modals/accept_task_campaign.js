import { EmbedBuilder, MessageFlags } from 'discord.js';
import { getTicket } from '../db/database.js';
import { moveTicket } from '../handlers/ticketHandler.js';
import { notifyDmFailed } from '../handlers/dmHandler.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function acceptTaskCampaign(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config       = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const channelId    = interaction.customId.split('|')[1];
  const ticket       = getTicket(channelId);
  const campaignInfo = interaction.fields.getTextInputValue('campaign_link').trim();

  const campaignSection = campaignInfo ? `\n\n📌 **Your Campaign:**\n${campaignInfo}` : '';
  const dmText =
    `🎉 Congratulations <@${ticket.user_id}>! You passed the task and are now a **Creator at Icreateflow**!\n\n` +
    `Welcome to the team — check your ticket channel for next steps.` +
    campaignSection +
    `\n\n📢 You can also view all active campaigns in <#1503661010320363621> to join more campaigns.`;

  try {
    const user = await interaction.client.users.fetch(ticket.user_id);
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅  You\'re a Creator!')
      .setDescription(dmText)
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch {
    const ticketChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (ticketChannel) await notifyDmFailed(ticketChannel, ticket.user_id);
  }

  await moveTicket(interaction.client, config, channelId, 'approved', {
    actorId: interaction.user.id,
    skipDm: true,
  });

  await interaction.editReply({ content: '✅ Application accepted. Creator DM sent.' });
}
