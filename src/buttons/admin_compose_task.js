import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketsByStatus } from '../db/database.js';

export default async function adminComposeTask(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  // Category-level options (mirrors admin_compose_normal structure)
  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel('📋 All in-task tickets')
      .setDescription('Send task to every ticket currently in review')
      .setValue('status:in_task'),
    new StringSelectMenuOptionBuilder()
      .setLabel('📂 All open tickets')
      .setDescription('Tickets still filling out the intake form')
      .setValue('status:open'),
  ];

  // Individual ticket owners from all active statuses (max 23 to stay within Discord's 25 limit)
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
    .setCustomId('admin_select_task_user')
    .setPlaceholder('Choose who to send this task to…')
    .addOptions(options);

  await interaction.reply({
    content: '**📋 Send Task — Select target:**',
    components: [new ActionRowBuilder().addComponents(select)],
    flags: MessageFlags.Ephemeral,
  });
}
