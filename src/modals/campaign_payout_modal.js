import { EmbedBuilder, MessageFlags } from 'discord.js';
import { insertPayoutSubmission } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

export default async function campaignPayoutModal(interaction) {
  const fullName       = interaction.fields.getTextInputValue('full_name').trim();
  const wiseTag        = interaction.fields.getTextInputValue('wise_tag').trim() || '—';
  const usdtAddress    = interaction.fields.getTextInputValue('usdt_address').trim() || '—';
  const variationsRaw  = interaction.fields.getTextInputValue('variations_count').trim();
  const expectedPayout = interaction.fields.getTextInputValue('expected_payout').trim();
  const userId         = interaction.user.id;
  const guildId        = interaction.guildId;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const variationsCount = parseInt(variationsRaw);
  if (isNaN(variationsCount) || variationsCount < 1) {
    return interaction.editReply({ content: '❌ Please enter a valid number for variations count.' });
  }

  insertPayoutSubmission({ guildId, userId, fullName, wiseTag, usdtAddress, variationsCount, expectedPayout });

  await interaction.editReply({
    content:
      '✅ **Payout info submitted!** Staff will review and process your payment shortly.\n\n' +
      `📝 **Summary:**\n` +
      `• Name: ${fullName}\n` +
      `• Wise: ${wiseTag}\n` +
      `• USDT: \`${usdtAddress}\`\n` +
      `• Variations: ${variationsCount}\n` +
      `• Expected: ${expectedPayout}`,
  });

  // Post to log channel
  try {
    const config     = loadCampaignConfig();
    const logChannel = await interaction.client.channels.fetch(config.channels.log).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('💰 Payout Submission')
        .addFields(
          { name: 'User',            value: `<@${userId}>`,  inline: true },
          { name: 'Full Name',       value: fullName,         inline: true },
          { name: 'Wise Tag',        value: wiseTag,          inline: true },
          { name: 'USDT TRC20',      value: usdtAddress,      inline: false },
          { name: 'Variations Made', value: `${variationsCount}`, inline: true },
          { name: 'Expected Payout', value: expectedPayout,   inline: true },
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  } catch (err) {
    log.warn(`[campaign_payout_modal] Log post failed: ${err.message}`);
  }

  log.info(`[campaign] Payout submitted by ${interaction.user.tag}: ${expectedPayout}`);
}
