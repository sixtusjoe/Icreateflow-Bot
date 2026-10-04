import { EmbedBuilder, MessageFlags } from 'discord.js';
import { upsertAccountSubmission, getCurrentVariation, getUserAccounts } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

const PLATFORM_LABELS = {
  tiktok:    'TikTok',
  instagram: 'Instagram',
  youtube:   'YouTube',
  facebook:  'Facebook',
};
const ALL_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'];

export default async function campaignAccountModal(interaction) {
  const platform = interaction.customId.split('|')[1];
  const username = interaction.fields.getTextInputValue('username').trim();
  const email    = interaction.fields.getTextInputValue('email').trim();
  const password = interaction.fields.getTextInputValue('password');
  const userId   = interaction.user.id;
  const guildId  = interaction.guildId;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const variationNumber = getCurrentVariation(userId, guildId);

  upsertAccountSubmission({ guildId, userId, variationNumber, platform, username, email, password });

  // Build ephemeral summary of all user submissions
  const allAccounts = getUserAccounts(userId, guildId);
  const byVariation = {};
  for (const acct of allAccounts) {
    if (!byVariation[acct.variation_number]) byVariation[acct.variation_number] = {};
    byVariation[acct.variation_number][acct.platform] = acct.username;
  }

  let summary = '';
  const variations = Object.keys(byVariation).map(Number).sort((a, b) => a - b);
  for (const vNum of variations) {
    const isCurrent = vNum === variationNumber;
    summary += `\n**Variation ${vNum}${isCurrent ? ' (current)' : ''}:**\n`;
    for (const p of ALL_PLATFORMS) {
      const val = byVariation[vNum][p];
      summary += `  ${PLATFORM_LABELS[p]}: ${val ? `\`${val}\` ✅` : '— *(not submitted)*'}\n`;
    }
  }

  await interaction.editReply({
    content: `✅ **${PLATFORM_LABELS[platform] ?? platform}** account saved for Variation ${variationNumber}!\n${summary}`,
  });

  // Post to log channel (omit password from log)
  try {
    const config     = loadCampaignConfig();
    const logChannel = await interaction.client.channels.fetch(config.channels.log).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📱 Account Submission')
        .addFields(
          { name: 'User',       value: `<@${userId}>`,           inline: true },
          { name: 'Platform',   value: PLATFORM_LABELS[platform], inline: true },
          { name: 'Variation',  value: `#${variationNumber}`,     inline: true },
          { name: 'Username',   value: username,  inline: true },
          { name: 'Email',      value: email,     inline: true },
          { name: 'Password',   value: password,  inline: true },
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  } catch (err) {
    log.warn(`[campaign_account_modal] Log channel post failed: ${err.message}`);
  }

  log.info(`[campaign] Account saved: ${userId} ${platform} variation ${variationNumber}`);
}
