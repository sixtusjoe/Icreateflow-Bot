import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getAllPayoutSubmissions } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('payouts')
    .setDescription('View all payout submissions (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadCampaignConfig();
    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const all = getAllPayoutSubmissions(interaction.guildId);

    if (all.length === 0) {
      return interaction.editReply({ content: '💰 No payout submissions yet.' });
    }

    const lines = all.slice(0, 20).map((p, i) => {
      const date = new Date(p.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return (
        `**${i + 1}. <@${p.user_id}>** — ${date}\n` +
        `  Name: ${p.full_name} | Wise: ${p.wise_tag}\n` +
        `  USDT: \`${p.usdt_address}\`\n` +
        `  Variations: ${p.variations_count} | Expected: **${p.expected_payout}**`
      );
    });

    const extra = all.length > 20 ? `\n*…and ${all.length - 20} more.*` : '';
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`💰 Payout Submissions (${all.length} total)`)
      .setDescription(lines.join('\n\n') + extra);

    await interaction.editReply({ embeds: [embed] });
  },
};
