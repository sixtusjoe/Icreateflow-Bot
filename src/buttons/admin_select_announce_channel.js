import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default async function adminSelectAnnounceChannel(interaction) {
  const channelId = interaction.values[0];
  const channel   = interaction.guild.channels.cache.get(channelId);
  const name      = channel?.name ?? channelId;

  const modal = new ModalBuilder()
    .setCustomId(`admin_announce_modal|${channelId}`)
    .setTitle(`Announce → #${name}`.slice(0, 45));

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('header')
        .setLabel('Message header / title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Message from Staff')
        .setMaxLength(100)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Message content')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('mention')
        .setLabel('Mention (everyone / here / leave blank)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('everyone')
        .setRequired(false)
    ),
  );

  await interaction.showModal(modal);
}
