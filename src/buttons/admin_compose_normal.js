import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketsByStatus } from '../db/database.js';

export default async function adminComposeNormal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel('📢 All tickets (open + task + approved)')
      .setDescription('Send to every active ticket')
      .setValue('status:all'),
    new StringSelectMenuOptionBuilder()
      .setLabel('📂 All open tickets')
      .setDescription('Tickets still filling out the intake form')
      .setValue('status:open'),
    new StringSelectMenuOptionBuilder()
      .setLabel('📋 All in-task tickets')
      .setDescription('Tickets currently in the review/task stage')
      .setValue('status:task'),
    new StringSelectMenuOptionBuilder()
      .setLabel('✅ All approved tickets')
      .setDescription('Tickets that have been accepted')
      .setValue('status:approved'),
  ];

  // Add individual ticket owners from all active statuses (max 21 to stay within 25 total)
  const all = [
    ...getTicketsByStatus('open'),
    ...getTicketsByStatus('in_task'),
    ...getTicketsByStatus('approved'),
  ];

  const seen = new Set();
  for (const ticket of all) {
    if (seen.has(ticket.user_id)) continue;
    seen.add(ticket.user_id);
    if (options.length >= 25) break;

    const channelName = interaction.client.channels.cache.get(ticket.channel_id)?.name ?? ticket.channel_id;
    const statusLabel = { open: 'Open', in_task: 'In Task', approved: 'Approved' }[ticket.status] ?? ticket.status;
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`@${channelName}`)
        .setDescription(`${statusLabel} — User ID: ${ticket.user_id}`)
        .setValue(ticket.user_id)
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('admin_select_normal_user')
    .setPlaceholder('Choose who to message…')
    .addOptions(options);

  await interaction.reply({
    content: '**💬 Send Message — Select target:**',
    components: [new ActionRowBuilder().addComponents(select)],
    flags: MessageFlags.Ephemeral,
  });
}
