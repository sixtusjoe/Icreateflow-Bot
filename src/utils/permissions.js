import { PermissionFlagsBits } from 'discord.js';

export function isStaff(member, config) {
  return member.roles.cache.has(config.roles.staff) ||
         member.roles.cache.has(config.roles.senior) ||
         member.permissions.has(PermissionFlagsBits.Administrator);
}

export function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

const BOT_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
];

export function buildTicketPermissions(userId, config, botId) {
  const overwrites = [
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.MentionEveryone,
      ],
    },
    {
      id: config.roles.staff,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: config.roles.senior,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  // Bot must always have explicit access regardless of category overwrites
  if (botId) overwrites.push({ id: botId, allow: BOT_ALLOW });

  return overwrites;
}

export function everyoneDeny(guildId) {
  return {
    id: guildId,
    deny: [PermissionFlagsBits.ViewChannel],
  };
}
