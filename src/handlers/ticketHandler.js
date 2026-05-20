import {
  getTicket,
  updateTicket,
  insertEvent,
  getAllOpenTicketsForUser,
} from '../db/database.js';
import {
  buildTaskActionEmbed,
  buildApprovedEmbed,
  buildDeniedEmbed,
  buildClosedEmbed,
  taskActionRow,
} from '../utils/embeds.js';
import { sendDm, notifyDmFailed } from './dmHandler.js';
import { logEvent } from './logHandler.js';
import { cancelTimer } from './timerHandler.js';
import { generateTranscript, postTranscript } from './transcriptHandler.js';
import { buildTicketPermissions, everyoneDeny } from '../utils/permissions.js';
import { buildVars } from '../utils/templates.js';
import { log } from '../utils/logger.js';

export async function moveTicket(client, config, channelId, destination, options = {}) {
  const ticket = getTicket(channelId);
  if (!ticket) return;

  const categoryId = config.categories[destination]; // may be null for denied/closed

  const channel = await client.channels.fetch(channelId);
  const guild   = channel.guild;

  const statusMap = {
    open:     'open',
    task:     'in_task',
    approved: 'approved',
    denied:   'denied',
    closed:   'closed',
  };
  const newStatus = statusMap[destination];

  if (categoryId) await channel.setParent(categoryId, { lockPermissions: false });
  updateTicket(channelId, {
    status: newStatus,
    currentCategoryId: categoryId ?? ticket.current_category_id,
    lastActivityAt: Date.now(),
  });

  await logEvent(
    'moved',
    { Channel: `<#${channelId}>`, From: ticket.status, To: newStatus, Actor: options.actorId ? `<@${options.actorId}>` : 'System' },
    { channelId, actorId: options.actorId, metadata: { from: ticket.status, to: newStatus } }
  );

  if (destination === 'task') {
    cancelTimer(channelId);

    // Post staff review embed in a private thread — only staff with Manage Threads see it,
    // user stays in the ticket channel with full access and never sees the buttons
    const updatedTicket = getTicket(channelId);
    const embed = buildTaskActionEmbed(updatedTicket, config, guild);
    try {
      const { ChannelType } = await import('discord.js');
      const thread = await channel.threads.create({
        name: '🔒 Staff Review',
        type: ChannelType.PrivateThread,
        invitable: false,
      });
      await thread.send({ embeds: [embed], components: [taskActionRow(channelId)] });

      // Add all staff and senior members to the thread so they can see it
      const members = await guild.members.fetch();
      for (const [, member] of members) {
        if (member.roles.cache.has(config.roles.staff) || member.roles.cache.has(config.roles.senior)) {
          await thread.members.add(member.id).catch(() => {});
        }
      }
    } catch (err) {
      log.warn(`[ticketHandler] Failed to create staff review thread: ${err.message}`);
      await channel.send({ embeds: [embed], components: [taskActionRow(channelId)] });
    }

    if (!options.skipDm) {
      const vars = buildVars({ user: `<@${ticket.user_id}>`, guild: guild.name, channel: `<#${channelId}>` });
      const result = await sendDm(client, ticket.user_id, 'moved_to_task', vars, channelId);
      if (!result.success) await notifyDmFailed(channel, ticket.user_id);
    }
  }

  if (destination === 'approved') {
    cancelTimer(channelId);

    // Assign Creator role — grants access to the approved category via role-based permission.
    // Remove the user's channel-level overwrite so the role permission takes effect cleanly.
    if (config.roles.creator && config.roles.creator !== 'REPLACE_WITH_CREATOR_ROLE_ID') {
      try {
        const member = await guild.members.fetch(ticket.user_id);
        await member.roles.add(config.roles.creator);
        log.info(`[ticketHandler] Assigned Creator role to ${ticket.user_id}`);
      } catch (err) {
        log.warn(`[ticketHandler] Failed to assign Creator role: ${err.message}`);
      }
    }

    if (config.roles.creator && config.roles.creator !== 'REPLACE_WITH_CREATOR_ROLE_ID') {
      try {
        await channel.permissionOverwrites.edit(config.roles.creator, {
          ViewChannel: true,
          ReadMessageHistory: true,
        });
        log.info(`[ticketHandler] Added Creator role overwrite to channel ${channelId}`);
      } catch (err) {
        log.warn(`[ticketHandler] Failed to add Creator role overwrite: ${err.message}`);
      }
    }

    const embed = buildApprovedEmbed(ticket, guild);
    await channel.send({ embeds: [embed] });

    // Rename channel with ✅ to visually mark creator approval
    const currentName = channel.name.replace(/^[^a-z0-9]+/i, '');
    await channel.setName(`✅-${currentName}`).catch(() => {});

    if (!options.skipDm) {
      const vars = buildVars({ user: `<@${ticket.user_id}>`, guild: guild.name });
      const result = await sendDm(client, ticket.user_id, 'accepted', vars, channelId);
      if (!result.success) await notifyDmFailed(channel, ticket.user_id);
    }
  }

  if (destination === 'denied') {
    const embed = buildDeniedEmbed(ticket, options.reason, guild);
    await channel.send({ embeds: [embed] });

    const deniedDelayMs = config.timers.denied_hard_delete_seconds * 1000;
    setTimeout(async () => {
      await channel.delete('Ticket denied').catch((err) => log.warn(`[ticketHandler] channel.delete (denied) failed: ${err.message}`));
      insertEvent({ channelId, eventType: 'deleted' });
      logEvent('deleted', { Channel: channelId, Owner: `<@${ticket.user_id}>` }, { channelId });
    }, Math.max(deniedDelayMs, 8000));

    if (!options.skipDm) {
      const vars = buildVars({ user: `<@${ticket.user_id}>`, guild: guild.name, reason: options.reason ?? 'No reason provided' });
      const result = await sendDm(client, ticket.user_id, 'denied_final', vars, channelId);
      if (!result.success) await notifyDmFailed(channel, ticket.user_id);
    }
  }

  if (destination === 'closed') {
    await closeTicket(client, config, channelId, options.reason ?? 'Moved to closed', options);
  }
}

export async function closeTicket(client, config, channelId, reason = 'No reason given', options = {}) {
  const ticket = getTicket(channelId);
  if (!ticket || ticket.status === 'closed') return;

  const now = Date.now();
  updateTicket(channelId, {
    status: 'closed',
    closedAt: now,
    closedReason: reason,
    timerExpiresAt: null,
    lastActivityAt: now,
  });

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const guild = channel.guild;
  const attachment = await generateTranscript(channel, getTicket(channelId), client);
  await postTranscript(client, config, getTicket(channelId), channel, attachment);

  if (!options.skipDm) {
    const templateKey = reason === 'inactivity' ? 'closed_inactive' : 'closed_manual';
    const vars = buildVars({
      user: `<@${ticket.user_id}>`,
      guild: guild.name,
      reason,
    });
    const result = await sendDm(client, ticket.user_id, templateKey, vars, channelId);
    if (!result.success) await notifyDmFailed(channel, ticket.user_id);
  }

  await logEvent(
    'closed',
    { Channel: `<#${channelId}>`, Owner: `<@${ticket.user_id}>`, Reason: reason },
    { channelId, actorId: options.actorId, metadata: { reason } }
  );

  const closedEmbed = buildClosedEmbed(getTicket(channelId), reason, guild);
  await channel.send({ embeds: [closedEmbed] }).catch(() => {});

  const deleteDelayMs = config.timers.closed_hard_delete_hours * 3600 * 1000;
  const deleteAt = now + Math.max(deleteDelayMs, 10000);
  updateTicket(channelId, { deleteAt });
}

export async function closeAllTicketsForUser(client, config, userId) {
  const tickets = getAllOpenTicketsForUser(userId);
  for (const ticket of tickets) {
    try {
      await closeTicket(client, config, ticket.channel_id, 'User left server', { skipDm: true });
    } catch (err) {
      log.error(`[ticketHandler] Failed to close ticket ${ticket.channel_id} on member leave:`, err.message);
    }
  }
}
