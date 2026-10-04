import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default async function campaignSelectAnnounceChannel(interaction) {
  const channelId = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`campaign_announce_modal|${channelId}`)
    .setTitle('Send Announcement');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('header')
        .setLabel('Message header / title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Announcement')
        .setMaxLength(100)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Message content')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Write your message here…')
        .setMaxLength(4000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('mention')
        .setLabel('Mention (everyone / here / leave blank)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('everyone  or  here  or leave blank')
        .setRequired(false)
    ),
  );

  await interaction.showModal(modal);
}
