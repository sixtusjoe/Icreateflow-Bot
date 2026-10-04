import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('campaign-panel')
    .setDescription('Post the creator ticket panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadCampaignConfig();
    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(parseInt(config.panel.color.replace('#', ''), 16))
      .setTitle(config.panel.title)
      .setDescription(config.panel.description);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('campaign_open_ticket')
        .setLabel(config.panel.button_label)
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Campaign panel posted.', flags: MessageFlags.Ephemeral });
  },
};
