import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('campaign-complete')
    .setDescription('Mark the campaign as complete and open payout submissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadCampaignConfig();
    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await interaction.client.channels.fetch(config.channels.payout_submission).catch(() => null);
    if (!channel) {
      return interaction.editReply({ content: '❌ Payout submission channel not found. Check config.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🎉 Campaign Complete!')
      .setDescription(
        'Great work everyone! The campaign has been completed.\n\n' +
        'Please submit your payout information below. Staff will process all payments shortly.\n\n' +
        '**Make sure to have ready:**\n' +
        '• Your full name\n' +
        '• Your Wise tag\n' +
        '• Your USDT TRC20 address\n' +
        '• Number of variations you created\n' +
        '• Your expected payout amount'
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('campaign_submit_payout')
        .setLabel('💰 Submit Payout Info')
        .setStyle(ButtonStyle.Success),
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ Campaign marked as complete. Payout submission posted in <#${channel.id}>.` });
  },
};
