import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

export default async function campaignSelectType(interaction) {
  const config     = loadCampaignConfig();
  const typeId     = interaction.values[0];
  const creatorType = config.creator_types.find(ct => ct.id === typeId);

  if (!creatorType) {
    return interaction.reply({ content: '❌ Unknown creator type.', flags: MessageFlags.Ephemeral });
  }

  // Disable the select menu on the original welcome message
  await interaction.update({ components: [] }).catch(() => {});

  const termsEmbed = new EmbedBuilder()
    .setColor(0xFFA500)
    .setTitle('⚠️ Retainer Agreement Required')
    .setDescription(
      `By selecting **${creatorType.label}**, you agree to the following terms:\n\n${creatorType.terms}`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`campaign_agree_terms|${typeId}`)
      .setLabel('✅ I Agree to the Terms')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('campaign_disagree_terms')
      .setLabel('I Disagree')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.channel.send({ embeds: [termsEmbed], components: [row] });
  log.info(`[campaign] Creator type selected: ${typeId} by ${interaction.user.tag}`);
}
