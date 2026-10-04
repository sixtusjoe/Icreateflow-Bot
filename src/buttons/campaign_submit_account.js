import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

const PLATFORM_LABELS = {
  tiktok:    'TikTok',
  instagram: 'Instagram',
  youtube:   'YouTube',
  facebook:  'Facebook',
};

export default async function campaignSubmitAccount(interaction) {
  const platform = interaction.customId.split('|')[1];
  const label    = PLATFORM_LABELS[platform] ?? platform;

  const modal = new ModalBuilder()
    .setCustomId(`campaign_account_modal|${platform}`)
    .setTitle(`Submit ${label} Account`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('username')
        .setLabel(`${label} Username / Profile URL`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('@username or profile link')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('email')
        .setLabel('Account Email')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('email@example.com')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('password')
        .setLabel('Account Password')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}
