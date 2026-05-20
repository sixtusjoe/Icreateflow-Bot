import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { buildNormalAdminEmbed } from '../utils/embeds.js';
import { log } from '../utils/logger.js';

export default async function adminAnnounceModal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Channel ID is encoded in the customId: admin_announce_modal|{channelId}
  const channelId = interaction.customId.split('|')[1];
  const header    = interaction.fields.getTextInputValue('header').trim() || 'Message from Staff';
  const content   = interaction.fields.getTextInputValue('content');
  const mentionRaw = interaction.fields.getTextInputValue('mention').trim().toLowerCase();

  // Resolve mention string
  let mention = '';
  if (mentionRaw === 'everyone' || mentionRaw === '@everyone') mention = '@everyone';
  else if (mentionRaw === 'here' || mentionRaw === '@here')    mention = '@here';

  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.editReply({ content: '❌ Channel not found.' });
  }

  const embed = buildNormalAdminEmbed(content, interaction.guild, header);

  try {
    await channel.send({
      content: mention || undefined,
      embeds:  [embed],
    });
    log.info(`[admin] Announcement sent by ${interaction.user.tag} to #${channel.name}${mention ? ` with ${mention}` : ''}`);
    await interaction.editReply({
      content: `✅ Message posted in <#${channelId}>${mention ? ` with **${mention}**` : ''}.`,
    });
  } catch (err) {
    log.error(`[adminAnnounceModal] Failed to send to ${channelId}: ${err.message}`);
    await interaction.editReply({ content: `❌ Failed to send: ${err.message}` });
  }
}
