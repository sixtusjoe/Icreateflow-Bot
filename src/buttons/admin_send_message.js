import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default async function adminSendMessage(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_compose_task')
      .setLabel('📋  Send Task')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('admin_compose_normal')
      .setLabel('💬  Send Normal Message')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: '**What would you like to send?**\n\n📋 **Task** — Sends a task embed with TikTok → Drive link flow and auto-close timers.\n💬 **Normal Message** — Sends a plain staff embed to selected tickets.',
    components: [row],
    ephemeral: true,
  });
}
