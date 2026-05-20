import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketsByStatus } from '../db/database.js';

export default async function adminComposeTask(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const tickets = getTicketsByStatus('in_task');

  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel('📋 All in-task tickets')
      .setDescription('Send this task to every ticket currently in review')
      .setValue('all'),
  ];

  // Add individual ticket owners (max 24 more to stay within Discord's 25 option limit)
  for (const ticket of tickets.slice(0, 24)) {
    const channelName = interaction.client.channels.cache.get(ticket.channel_id)?.name ?? ticket.channel_id;
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`@${channelName}`)
        .setDescription(`User ID: ${ticket.user_id}`)
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
