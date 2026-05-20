import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';

export default async function adminSendMessage(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_compose_task')
      .setLabel('📋  Send Task')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('admin_compose_normal')
      .setLabel('💬  Message Tickets')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_compose_announce')
      .setLabel('📢  Announce to Channel')
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({
    content: '**What would you like to send?**\n\n📋 **Task** — Sends a task embed with TikTok → Drive link flow and auto-close timers.\n💬 **Message Tickets** — Sends a staff embed to selected ticket channels.\n📢 **Announce to Channel** — Post in any server channel with optional @everyone / @here.',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
