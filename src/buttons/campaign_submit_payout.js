import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default async function campaignSubmitPayout(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('campaign_payout_modal')
    .setTitle('Submit Payout Information');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('full_name')
        .setLabel('Full Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Your legal full name')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('wise_tag')
        .setLabel('Wise Tag (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('@wisetag')
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('usdt_address')
        .setLabel('USDT TRC20 Address (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('T...')
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('variations_count')
        .setLabel('How Many Variations Did You Create?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. 3')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('expected_payout')
        .setLabel('Expected Payout Amount')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. $25 or 25 USD')
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}
