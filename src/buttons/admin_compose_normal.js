import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } from 'discord.js';

export default async function adminComposeNormal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId('admin_normal_modal')
    .setTitle('Send Message to Tickets');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('target')
        .setLabel("Target: 'all' or a specific user ID")
        .setStyle(TextInputStyle.Short)
        .setValue('all')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('status_filter')
        .setLabel("Category filter: open / task / approved / all")
        .setStyle(TextInputStyle.Short)
        .setValue('task')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Message content')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}
