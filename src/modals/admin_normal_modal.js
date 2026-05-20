import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketsByStatus, getOpenTicketForUser } from '../db/database.js';
import { buildNormalAdminEmbed } from '../utils/embeds.js';
import { log } from '../utils/logger.js';

export default async function adminNormalModal(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Target is encoded in customId: admin_normal_modal|{userId|status:open|status:all...}
  const target  = interaction.customId.split('|')[1] ?? 'status:all';
  const header  = interaction.fields.getTextInputValue('header').trim() || 'Message from Staff';
  const content = interaction.fields.getTextInputValue('content');

  // Determine target channels
  let channelIds = [];

  if (target.startsWith('status:')) {
    const filter = target.replace('status:', '');
    const statuses = filter === 'all' ? ['open', 'in_task', 'approved']
      : filter === 'task' ? ['in_task']
      : [filter];
    for (const s of statuses) {
      const tickets = getTicketsByStatus(s);
      channelIds.push(...tickets.map(t => t.channel_id));
    }
  } else {
    // target is a user ID
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
  const embed = buildNormalAdminEmbed(content, guild, header);

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
