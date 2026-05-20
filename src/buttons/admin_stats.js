import { EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTicketStats } from '../db/database.js';

export default async function adminStats(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
  }

  const { statuses, total, dmsSent } = getTicketStats();

  const statusMap = {};
  for (const row of statuses) statusMap[row.status] = row.count;

  const embed = new EmbedBuilder()
    .setColor(0xCCCC00)
    .setTitle('📊  Ticket Statistics')
    .addFields(
      { name: '🟡  Open',       value: String(statusMap.open     ?? 0), inline: true },
      { name: '🔵  In Review',  value: String(statusMap.in_task  ?? 0), inline: true },
      { name: '🟢  Approved',   value: String(statusMap.approved ?? 0), inline: true },
      { name: '🔴  Denied',     value: String(statusMap.denied   ?? 0), inline: true },
      { name: '⚫  Closed',     value: String(statusMap.closed   ?? 0), inline: true },
      { name: '📨  DMs Sent',   value: String(dmsSent),                 inline: true },
      { name: '🎫  Total Ever', value: String(total),                   inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
