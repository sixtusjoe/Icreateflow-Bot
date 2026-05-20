import { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, PermissionFlagsBits, MessageFlags } from 'discord.js';

export default async function adminComposeAnnounce(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('admin_select_announce_channel')
    .setPlaceholder('Pick a channel to post in…')
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

  await interaction.reply({
    content: '**📢 Announce to Channel — Pick where to send:**',
    components: [new ActionRowBuilder().addComponents(channelSelect)],
    flags: MessageFlags.Ephemeral,
  });
}
