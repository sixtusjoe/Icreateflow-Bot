import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default async function adminSelectNormalUser(interaction) {
  const selected = interaction.values[0]; // userId or 'status:open' etc.

  const label = selected.startsWith('status:')
    ? { 'status:all': 'All Tickets', 'status:open': 'All Open', 'status:task': 'All In-Task', 'status:approved': 'All Approved' }[selected] ?? selected
    : interaction.component.options?.find(o => o.value === selected)?.label?.replace(/^@/, '') ?? selected;

  const modal = new ModalBuilder()
    .setCustomId(`admin_normal_modal|${selected}`)
    .setTitle(`Message → ${label}`);

  modal.addComponents(
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
