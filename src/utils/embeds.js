import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { renderString } from './templates.js';

const COLORS = {
  open:     0xCCCC00,
  in_task:  0x5865F2,
  approved: 0x57F287,
  denied:   0xED4245,
  closed:   0x4F545C,
  log:      0xB8B800,
  info:     0xCCCC00,
};

const STATUS_LABEL = {
  open:     'Open',
  in_task:  'In Review',
  approved: 'Approved',
  denied:   'Denied',
  closed:   'Closed',
};

const STEP_ORDER = ['Open', 'Review', 'Decision', 'Closed'];
const STEP_MAP   = { open: 0, in_task: 1, approved: 2, denied: 2, closed: 3 };

function stepFooter(status) {
  const current = STEP_MAP[status] ?? 0;
  return STEP_ORDER.map((s, i) => i <= current ? `◉ ${s}` : `◯ ${s}`).join('  ·  ');
}

function base(status) {
  return new EmbedBuilder()
    .setColor(COLORS[status] ?? COLORS.info)
    .setTimestamp();
}

export function buildPanelEmbed(config, guild) {
  const embed = base('open')
    .setTitle(config.panel.title)
    .setDescription(config.panel.description)
    .setFooter({ text: guild?.name ?? 'Support System' });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildWelcomeEmbed(ticket, config, guild, timerMinutes) {
  const userId = ticket.user_id ?? ticket.userId;
  const welcomeText = renderString(config.welcome_message ?? '', {
    user: `<@${userId}>`,
    initial_inactivity_minutes: timerMinutes,
    intake_form_url: config.intake_form_url,
  });
  const embed = base('open')
    .setTitle('🎫  Ticket Opened')
    .setDescription(welcomeText)
    .addFields(
      { name: '👤  Owner',  value: `<@${userId}>`,      inline: true },
      { name: '📋  Status', value: STATUS_LABEL['open'],        inline: true },
      { name: '⏱️  Timer',  value: `${timerMinutes} min`,       inline: true },
      { name: '📝  Form',   value: `[Click here to open the form](${config.intake_form_url})`, inline: false }
    )
    .setFooter({ text: stepFooter('open') });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildTaskActionEmbed(ticket, config, guild) {
  const retriesLeft = config.max_retries - (ticket.retry_count ?? 0);
  const created = new Date(ticket.created_at).toUTCString();

  const embed = base('in_task')
    .setTitle('📋  New Ticket Ready for Review')
    .setDescription('Use the buttons below to accept, deny, or return the application for revision.')
    .addFields(
      { name: '👤  Owner',         value: `<@${ticket.user_id}>`,        inline: true },
      { name: '📋  Status',        value: 'In Review',                    inline: true },
      { name: '🔄  Retries Left',  value: String(retriesLeft),            inline: true },
      { name: '🎫  Ticket',        value: `<#${ticket.channel_id}>`,      inline: true },
      { name: '🕐  Opened',        value: created,                        inline: false }
    )
    .setFooter({ text: stepFooter('in_task') });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildApprovedEmbed(ticket, guild) {
  const embed = base('approved')
    .setTitle('🎉  Task Passed — Welcome, Creator!')
    .setDescription(`Congratulations <@${ticket.user_id}>! You passed the task and are now a **Creator at Icreateflow**. Check your DMs for your campaign details.`)
    .addFields(
      { name: '👤  Creator',  value: `<@${ticket.user_id}>`, inline: true },
      { name: '📋  Status',   value: '✅ Approved',           inline: true }
    )
    .setFooter({ text: stepFooter('approved') });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildDeniedEmbed(ticket, reason, guild) {
  const embed = base('denied')
    .setTitle('❌  Application Denied')
    .setDescription(`<@${ticket.user_id}>'s application has been denied.`)
    .addFields(
      { name: '👤  Owner',  value: `<@${ticket.user_id}>`, inline: true },
      { name: '📋  Status', value: 'Denied',                inline: true },
      { name: '📝  Reason', value: reason ?? 'No reason provided', inline: false }
    )
    .setFooter({ text: stepFooter('denied') });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildRetryEmbed(ticket, reason, config, guild) {
  const retriesLeft = config.max_retries - (ticket.retry_count ?? 0);

  const embed = base('open')
    .setTitle('🔄  Application Returned for Revision')
    .setDescription(`<@${ticket.user_id}>, your application needs revision. Please update your responses and tag @staff again when ready.`)
    .addFields(
      { name: '📝  Reason',         value: reason,             inline: false },
      { name: '🔄  Retries Left',   value: String(retriesLeft), inline: true },
      { name: '📋  Status',         value: 'Open',              inline: true }
    )
    .setFooter({ text: stepFooter('open') });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildClosedEmbed(ticket, reason, guild) {
  const embed = base('closed')
    .setTitle('🔒  Ticket Closed')
    .setDescription(`This ticket has been closed.`)
    .addFields(
      { name: '👤  Owner',  value: `<@${ticket.user_id}>`,    inline: true },
      { name: '📋  Status', value: 'Closed',                   inline: true },
      { name: '📝  Reason', value: reason ?? 'No reason given', inline: false }
    )
    .setFooter({ text: stepFooter('closed') });

  if (guild?.iconURL()) embed.setThumbnail(guild.iconURL({ dynamic: true }));
  return embed;
}

export function buildLogEmbed(eventType, fields = {}) {
  const EMOJI = {
    created:          '🆕',
    timer_cancelled:  '💬',
    moved:            '➡️',
    trigger_fired:    '🎯',
    accepted:         '✅',
    denied:           '❌',
    closed:           '🔒',
    deleted:          '🗑️',
    dm_sent:          '📨',
    dm_failed:        '📪',
    role_assigned:    '🏷️',
    role_removed:     '🏷️',
  };

  const emoji = EMOJI[eventType] ?? '📋';
  const embed = new EmbedBuilder()
    .setColor(COLORS.log)
    .setTitle(`${emoji}  ${eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`)
    .setTimestamp();

  const embedFields = Object.entries(fields).map(([name, value]) => ({
    name,
    value: String(value),
    inline: true,
  }));
  if (embedFields.length > 0) embed.addFields(embedFields);

  return embed;
}

export function buildUserInfoEmbed(member, ticket, guild) {
  const roles = member.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .join(', ') || 'None';

  const rolesDisplay = roles.length > 1024 ? roles.slice(0, 1020) + '…' : roles;
  const joined   = member.joinedAt  ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
  const created  = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

  const embed = base('info')
    .setTitle(`👤  User Info — ${member.user.username}`)
    .setDescription(`Information about the ticket owner <@${member.id}>`)
    .addFields(
      { name: '🪪  Username',        value: `${member.user.tag}`,    inline: true },
      { name: '🗓️  Account Created', value: created,                 inline: true },
      { name: '📥  Joined Server',   value: joined,                  inline: true },
      { name: '🎖️  Roles',           value: rolesDisplay,            inline: false }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: ticket ? stepFooter(ticket.status) : '' });

  return embed;
}

export function buildDmEmbed(title, description, status = 'info') {
  return new EmbedBuilder()
    .setColor(COLORS[status] ?? COLORS.info)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function buildIntakeFormEmbed(config) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📝  Intake Form')
    .setDescription(`Please complete the intake form to proceed with your ticket.\n\n[**Click here to open the form →**](${config.intake_form_url})`)
    .setFooter({ text: 'Complete the form, then tag @Support Staff in this channel.' })
    .setTimestamp();
}

export function taskActionRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_task|${channelId}`)
      .setLabel('✅  Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`deny_final|${channelId}`)
      .setLabel('❌  Deny — Final')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`deny_retry|${channelId}`)
      .setLabel('🔄  Allow Retry')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`user_info|${channelId}`)
      .setLabel('👤  User Info')
      .setStyle(ButtonStyle.Secondary)
  );
}

export function closeButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒  Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );
}

export function openTicketRow(label = 'Open Ticket') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel(label)
      .setStyle(ButtonStyle.Primary)
  );
}
