import { SlashCommandBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an embedded message to any campaign channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadCampaignConfig();
    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    const select = new ChannelSelectMenuBuilder()
      .setCustomId('campaign_select_announce_channel')
      .setPlaceholder('Pick a channel to send the message to…')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

    await interaction.reply({
      content: '**📢 Announce — Select a channel:**',
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
