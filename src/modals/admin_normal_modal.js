import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketsByStatus, getTicketsByTaskStage, getOpenTicketForUser, getTicket } from '../db/database.js';
import { buildNormalAdminEmbed } from '../utils/embeds.js';
import { renderString } from '../utils/templates.js';
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

  if (target.startsWith('stage:')) {
    // Filter by specific task_stage (awaiting_tiktok, awaiting_drive, drive_submitted)
    const taskStage = target.replace('stage:', '');
    const tickets = getTicketsByTaskStage(taskStage, interaction.guildId);
    channelIds.push(...tickets.map(t => t.channel_id));
  } else if (target.startsWith('status:')) {
    const filter = target.replace('status:', '');
    const statuses = filter === 'all' ? ['open', 'in_task', 'approved']
      : filter === 'task' ? ['in_task']
      : [filter];
    for (const s of statuses) {
      const tickets = getTicketsByStatus(s, interaction.guildId);
      channelIds.push(...tickets.map(t => t.channel_id));
    }
  } else {
    // target is a user ID
    const ticket = getOpenTicketForUser(target, interaction.guildId);
    if (!ticket) {
      return interaction.editReply({ content: `❌ No open ticket found for user <@${target}>.` });
    }
    channelIds = [ticket.channel_id];
  }

  if (channelIds.length === 0) {
    return interaction.editReply({ content: '❌ No matching tickets found.' });
  }

  const guild = interaction.guild;
  // Detect if the message uses {user} — if so we need a per-channel render + ping
  const hasUserTag = content.includes('{user}') || header.includes('{user}');

  let sent = 0, failed = 0;
  for (const channelId of channelIds) {
    try {
      const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
      if (!channel) { failed++; continue; }

      let resolvedContent = content;
      let resolvedHeader  = header;
      let pingContent     = undefined;

      if (hasUserTag) {
        const ticket = getTicket(channelId);
        const userId = ticket?.user_id;
        if (userId) {
          const vars = { user: `<@${userId}>` };
          resolvedContent = renderString(content, vars);
          resolvedHeader  = renderString(header,  vars);
          pingContent     = `<@${userId}>`;   // actual ping so they get notified
        }
      }

      const embed = buildNormalAdminEmbed(resolvedContent, guild, resolvedHeader);
      await channel.send({ content: pingContent, embeds: [embed] });
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
