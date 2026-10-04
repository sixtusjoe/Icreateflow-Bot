import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { createTicket, getOpenTicketForUser } from '../db/database.js';
import { loadCampaignConfig } from '../utils/campaignConfig.js';
import { log } from '../utils/logger.js';

export default async function campaignOpenTicket(interaction) {
  const config = loadCampaignConfig();
  const guild  = interaction.guild;
  const user   = interaction.user;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Check user has the creator role on this server
  const member = interaction.member;
  if (!member.roles.cache.has(config.roles.creator)) {
    log.warn(`[campaign_open_ticket] ${user.tag} (${user.id}) blocked — missing creator role`);
    return interaction.editReply({
      content: '❌ You must be an approved creator to open a ticket. If you believe this is a mistake, please contact staff.',
    });
  }
  log.info(`[campaign_open_ticket] ${user.tag} opening ticket in ${guild.name}`);

  // Check for existing open ticket (guild-scoped)
  const existing = getOpenTicketForUser(user.id, guild.id);
  if (existing) {
    const existingChannel = await interaction.client.channels.fetch(existing.channel_id).catch(() => null);
    if (!existingChannel) {
      const { db } = await import('../db/database.js');
      db.prepare('DELETE FROM ticket_events WHERE channel_id = ?').run(existing.channel_id);
      db.prepare('DELETE FROM tickets WHERE channel_id = ?').run(existing.channel_id);
    } else {
      return interaction.editReply({
        content: `📋 You already have an open ticket: <#${existing.channel_id}>`,
      });
    }
  }

  // Build channel name from username
  const channelName = user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || `user-${user.id.slice(-4)}`;

  // Permissions: deny @everyone, allow user (read only — chat locked), allow staff, allow bot
  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny:  [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.CreatePublicThreads,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
      ],
    },
    {
      id: config.roles.staff,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.categories.tickets,
      permissionOverwrites,
      topic: `Ticket for ${user.tag}`,
    });
  } catch (err) {
    log.error('[campaign_open_ticket] Failed to create channel:', err.message);
    return interaction.editReply({ content: '❌ Failed to create ticket channel. Please contact an admin.' });
  }

  createTicket({
    channelId: channel.id,
    userId:    user.id,
    guildId:   guild.id,
    status:    'open',
    currentCategoryId: config.categories.tickets,
    timerExpiresAt:    null, // campaign tickets have no inactivity timer
  });

  // Build creator type select menu
  const options = config.creator_types.map(ct =>
    new StringSelectMenuOptionBuilder()
      .setLabel(ct.label)
      .setDescription(ct.description)
      .setValue(ct.id)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('campaign_select_type')
    .setPlaceholder('Choose Your Creator Type')
    .addOptions(options);

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0xCCCC00)
    .setTitle('📝 Next Steps')
    .setDescription('Tell us what you need help with.\n\nWe\'ll get back to you as soon as we can!')
    .addFields({
      name: '🔒 Chat Locked',
      value: 'Please select your creator type below to unlock chat. Staff can still message you.',
    })
    .setFooter({ text: `Ticket opened by ${user.username}`, iconURL: user.displayAvatarURL() });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('campaign_close_ticket')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    content: `<@${user.id}>`,
    embeds:  [welcomeEmbed],
    components: [new ActionRowBuilder().addComponents(select)],
  });

  await channel.send({ components: [closeRow] });

  log.info(`[campaign] Ticket opened for ${user.tag} in ${channel.name}`);
  await interaction.editReply({ content: `✅ Your ticket has been created: <#${channel.id}>` });
}
