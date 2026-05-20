import { PermissionFlagsBits } from 'discord.js';
import { getTicketsByStatus, getOpenTicketForUser } from '../db/database.js';
import { buildNormalAdminEmbed } from '../utils/embeds.js';
import { log } from '../utils/logger.js';

export default async function adminNormalModal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const target       = interaction.fields.getTextInputValue('target').trim();
  const statusFilter = interaction.fields.getTextInputValue('status_filter').trim().toLowerCase();
  const content      = interaction.fields.getTextInputValue('content');

  const STATUS_MAP = { open: 'open', task: 'in_task', approved: 'approved', all: null };
  const mappedStatus = STATUS_MAP[statusFilter];
  if (mappedStatus === undefined) {
    return interaction.editReply({ content: '❌ Category filter must be: open, task, approved, or all.' });
  }

  // Determine target channels
  let channelIds = [];

  if (target.toLowerCase() === 'all') {
    const statuses = mappedStatus ? [mappedStatus] : ['open', 'in_task', 'approved'];
    for (const s of statuses) {
      const tickets = getTicketsByStatus(s);
      channelIds.push(...tickets.map(t => t.channel_id));
    }
  } else {
    const ticket = getOpenTicketForUser(target);
    if (!ticket) {
      return interaction.editReply({ content: `❌ No open ticket found for user <@${target}>.` });
    }
    channelIds = [ticket.channel_id];
  }

  if (channelIds.length === 0) {
    return interaction.editReply({ content: '❌ No matching tickets found.' });
  }

  const guild = interaction.guild;
  const embed = buildNormalAdminEmbed(content, guild);

  let sent = 0, failed = 0;
  for (const channelId of channelIds) {
    try {
      const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
      if (!channel) { failed++; continue; }
      await channel.send({ embeds: [embed] });
      sent++;
    } catch (err) {
      log.error(`[adminNormalModal] Failed to send to ${channelId}: ${err.message}`);
      failed++;
    }
  }

  log.info(`[admin] Normal message sent by ${interaction.user.tag} to ${sent} ticket(s)`);
  await interaction.editReply({
    content: `✅ Message sent to **${sent}** ticket(s)${failed ? ` (${failed} failed)` : ''}.`,
  });
}
