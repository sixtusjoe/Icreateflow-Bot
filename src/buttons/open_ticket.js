import { ChannelType } from 'discord.js';
import { createTicket, getOpenTicketForUser } from '../db/database.js';
import { buildWelcomeEmbed, buildIntakeFormEmbed, closeButtonRow } from '../utils/embeds.js';
import { sendDm, notifyDmFailed } from '../handlers/dmHandler.js';
import { logEvent } from '../handlers/logHandler.js';
import { rearmTimer } from '../handlers/timerHandler.js';
import { buildTicketPermissions, everyoneDeny } from '../utils/permissions.js';
import { buildVars } from '../utils/templates.js';
import { log } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function openTicket(interaction) {
  const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf8'));
  const guild  = interaction.guild;
  const user   = interaction.user;

  await interaction.deferReply({ ephemeral: true });

  const existing = getOpenTicketForUser(user.id);
  if (existing) {
    // Verify the channel still exists — if not, auto-clear the stale record
    const existingChannel = await interaction.client.channels.fetch(existing.channel_id).catch(() => null);
    if (!existingChannel) {
      const { db } = await import('../db/database.js');
      db.prepare("DELETE FROM ticket_events WHERE channel_id = ?").run(existing.channel_id);
      db.prepare("DELETE FROM tickets WHERE channel_id = ?").run(existing.channel_id);
      log.warn(`[open_ticket] Cleared stale ticket record for deleted channel ${existing.channel_id}`);
    } else {
      return interaction.editReply({
        content: `📋 You already have an open ticket: <#${existing.channel_id}>\n\nPlease use your existing ticket instead of opening a new one.`,
      });
    }
  }

  const channelName = user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || `user-${user.id.slice(-4)}`;

  const category = config.categories.open;
  const permissionOverwrites = [
    everyoneDeny(guild.id),
    ...buildTicketPermissions(user.id, config, interaction.client.user.id),
  ];

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites,
      topic: `Ticket for ${user.tag}`,
    });
  } catch (err) {
    log.error('[open_ticket] Failed to create channel:', err.message);
    return interaction.editReply({ content: '❌ Failed to create ticket channel. Please contact an admin.' });
  }

  const timerMins = config.timers.initial_inactivity_minutes;
  const timerExpiresAt = Date.now() + timerMins * 60 * 1000;

  createTicket({
    channelId: channel.id,
    userId: user.id,
    guildId: guild.id,
    status: 'open',
    currentCategoryId: category,
    timerExpiresAt,
  });

  const ticketData = { user_id: user.id, channel_id: channel.id };
  const welcomeEmbed = buildWelcomeEmbed(ticketData, config, guild, timerMins);
  const formEmbed    = buildIntakeFormEmbed(config);

  // Ping user and ticket_ping role(s)
  let pingContent = `<@${user.id}>`;
  const pings = Array.isArray(config.roles.ticket_ping)
    ? config.roles.ticket_ping
    : [config.roles.ticket_ping];
  for (const roleId of pings) {
    if (roleId && !roleId.startsWith('ROLE_')) pingContent += ` <@&${roleId}>`;
  }

  await channel.send({ content: pingContent, embeds: [welcomeEmbed], components: [closeButtonRow()] });
  await channel.send({ embeds: [formEmbed] });

  await logEvent(
    'created',
    { Owner: `<@${user.id}>`, Channel: `<#${channel.id}>` },
    { channelId: channel.id, actorId: user.id }
  );

  const vars = buildVars({
    user:    user.username,
    guild:   guild.name,
    channel: `<#${channel.id}>`,
  });
  const dmResult = await sendDm(interaction.client, user.id, 'ticket_opened', vars, channel.id);
  if (!dmResult.success) await notifyDmFailed(channel, user.id);

  await interaction.editReply({
    content: `✅ Your ticket has been created: <#${channel.id}>`,
  });
}
