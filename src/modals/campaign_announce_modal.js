import { EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { log } from '../utils/logger.js';

export default async function campaignAnnounceModal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channelId = interaction.customId.split('|')[1];
  const header    = interaction.fields.getTextInputValue('header').trim() || 'Announcement';
  const content   = interaction.fields.getTextInputValue('content').trim();
  const mentionRaw = interaction.fields.getTextInputValue('mention').trim().toLowerCase();

  let mention = '';
  if (mentionRaw === 'everyone' || mentionRaw === '@everyone') mention = '@everyone';
  else if (mentionRaw === 'here' || mentionRaw === '@here')    mention = '@here';

  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.editReply({ content: '❌ Channel not found.' });
  }

  const embed = new EmbedBuilder()
    .setColor(0xCCCC00)
    .setTitle(`📢  ${header}`)
    .setDescription(content)
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() ?? undefined })
    .setTimestamp();

  await channel.send({ content: mention || undefined, embeds: [embed] });

  log.info(`[campaign] Announcement sent to #${channel.name} by ${interaction.user.tag}`);
  await interaction.editReply({ content: `✅ Message sent to <#${channelId}>.` });
}
