import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('campaign-account-panel')
    .setDescription('Post the account submission panel in #account-submission')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadCampaignConfig();
    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await interaction.client.channels.fetch(config.channels.account_submission).catch(() => null);
    if (!channel) {
      return interaction.editReply({ content: '❌ Account submission channel not found. Check config.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x7289DA)
      .setTitle('🗂️ Submit Your Social Media Accounts')
      .setDescription(
        'Click a button below to submit your account for each platform.\n\n' +
        'Each set of accounts (TikTok + Instagram + YouTube + Facebook) is called a **Variation**.\n' +
        'Use **➕ Add New Variation** to start a new set after completing the first.'
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('campaign_submit_account|tiktok')
        .setLabel('TikTok')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('campaign_submit_account|instagram')
        .setLabel('Instagram')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('campaign_submit_account|youtube')
        .setLabel('YouTube')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('campaign_submit_account|facebook')
        .setLabel('Facebook')
        .setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('campaign_add_variation')
        .setLabel('➕ Add New Variation')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('campaign_my_submissions')
        .setLabel('📋 My Submissions')
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embed], components: [row1, row2] });
    await interaction.editReply({ content: '✅ Account submission panel posted.' });
  },
};
