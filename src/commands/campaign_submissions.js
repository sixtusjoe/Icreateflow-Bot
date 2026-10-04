import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getAllAccountSubmissions } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';

const PLATFORM_LABELS = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook' };
const ALL_PLATFORMS   = ['tiktok', 'instagram', 'youtube', 'facebook'];

export default {
  data: new SlashCommandBuilder()
    .setName('submissions')
    .setDescription('View all account submissions (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadCampaignConfig();
    if (interaction.guildId !== config.guild_id) {
      return interaction.reply({ content: '❌ This command is for the campaign server only.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const all = getAllAccountSubmissions(interaction.guildId);

    if (all.length === 0) {
      return interaction.editReply({ content: '📋 No account submissions yet.' });
    }

    // Group by user → variation → platform
    const byUser = {};
    for (const acct of all) {
      if (!byUser[acct.user_id]) byUser[acct.user_id] = {};
      if (!byUser[acct.user_id][acct.variation_number]) byUser[acct.user_id][acct.variation_number] = {};
      byUser[acct.user_id][acct.variation_number][acct.platform] = acct.username;
    }

    const userIds = Object.keys(byUser);
    const embeds  = [];

    for (const userId of userIds.slice(0, 10)) { // max 10 users per call to avoid embed limits
      const variations = byUser[userId];
      let description  = '';

      for (const vNum of Object.keys(variations).map(Number).sort((a, b) => a - b)) {
        description += `**Variation ${vNum}:**\n`;
        for (const p of ALL_PLATFORMS) {
          const val = variations[vNum][p];
          description += `  ${PLATFORM_LABELS[p]}: ${val ? `\`${val}\`` : '—'}\n`;
        }
        description += '\n';
      }

      embeds.push(
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`<@${userId}>`)
          .setDescription(description.trim() || '—')
      );
    }

    const extra = userIds.length > 10 ? `\n*…and ${userIds.length - 10} more users.*` : '';
    await interaction.editReply({
      content: `📋 **Account Submissions** — ${userIds.length} creator(s)${extra}`,
      embeds,
    });
  },
};
