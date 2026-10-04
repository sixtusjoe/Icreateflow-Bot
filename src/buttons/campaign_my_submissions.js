import { MessageFlags } from 'discord.js';
import { getUserAccounts, getCurrentVariation } from '../db/database.js';

const PLATFORM_LABELS = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook' };
const ALL_PLATFORMS   = ['tiktok', 'instagram', 'youtube', 'facebook'];

export default async function campaignMySubmissions(interaction) {
  const userId  = interaction.user.id;
  const guildId = interaction.guildId;

  const allAccounts     = getUserAccounts(userId, guildId);
  const currentVariation = getCurrentVariation(userId, guildId);

  if (allAccounts.length === 0) {
    return interaction.reply({
      content: '📋 You have no account submissions yet. Use the platform buttons above to get started!',
      flags: MessageFlags.Ephemeral,
    });
  }

  const byVariation = {};
  for (const acct of allAccounts) {
    if (!byVariation[acct.variation_number]) byVariation[acct.variation_number] = {};
    byVariation[acct.variation_number][acct.platform] = acct.username;
  }

  let summary = '📋 **Your Submissions:**\n';
  const variations = Object.keys(byVariation).map(Number).sort((a, b) => a - b);
  for (const vNum of variations) {
    const isCurrent = vNum === currentVariation;
    summary += `\n**Variation ${vNum}${isCurrent ? ' (current)' : ''}:**\n`;
    for (const p of ALL_PLATFORMS) {
      const val = byVariation[vNum][p];
      summary += `  ${PLATFORM_LABELS[p]}: ${val ? `\`${val}\` ✅` : '— *(not submitted)*'}\n`;
    }
  }

  await interaction.reply({ content: summary, flags: MessageFlags.Ephemeral });
}
